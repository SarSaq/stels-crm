/**
 * ФИНАЛЬНЫЙ РАБОЧИЙ СКРИПТ (Основная таблица "Заказы 2026")
 * - Поддержка объединенной шапки "Ламинация" (без текста "Статус ламинации").
 * - При статусах "Готово" / "Отгружено" ВСЕ активные цеха принудительно закрываются в "Выполнено".
 * - При статусе "В работе" все активные цеха автоматически запускаются.
 * - Защита от пустых/незапущенных строк и отката финальных статусов назад.
 */
function mainLogic(e) {
  if (!e || !e.range) return;
  
  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName();
  
  // Скрипт работает ТОЛЬКО на главной рабочей вкладке
  if (sheetName !== "Заказы 2026") return;

  var range = e.range;
  var startCol = range.getColumn();
  var startRow = range.getRow();
  var numRows = range.getNumRows();
  var numCols = range.getNumColumns();

  // 1. Считываем заголовки один раз
  var maxColumns = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, maxColumns).getValues()[0];
  
  var getColIndex = function(name) {
    var idx = headers.indexOf(name);
    return idx !== -1 ? idx + 1 : 0;
  };

  var statusCol = getColIndex("Статус");
  var dateCol = getColIndex("Дата создания");

  if (statusCol === 0) return;

  // Ищем колонку ламинации по её единственному имени
  var laminationBaseCol = getColIndex("Ламинация");

  // 2. ДИНАМИЧЕСКАЯ КАРТА ЦЕХОВ
  var nodes = [
    { name: "Печать", type: "checkbox", checks: [getColIndex("Печать")], status: getColIndex("Печать") + 1 },
    { name: "Проварка", type: "checkbox", checks: [getColIndex("Проварка и люверсы")], status: getColIndex("Проварка и люверсы") + 1 },
    
    // ЛАМИНАЦИЯ: материал выбирается в laminationBaseCol, а статус — в соседней колонке справа (+ 1)
    { name: "Ламинация", type: "text", checks: [laminationBaseCol], status: laminationBaseCol > 0 ? laminationBaseCol + 1 : 0 },
    
    { name: "Резка", type: "checkbox", checks: [getColIndex("Плоттер"), getColIndex("Каттер")], status: getColIndex("Статус резки") },
    { name: "Фрезер", type: "checkbox", checks: [getColIndex("Фрезер")], status: getColIndex("Фрезер") + 1 },
    { name: "Сварка", type: "checkbox", checks: [getColIndex("Сварка")], status: getColIndex("Сварка") + 1 },
    { name: "Макетка", type: "checkbox", checks: [getColIndex("Макетка")], status: getColIndex("Сварочный цех") },
    { name: "Замеры", type: "checkbox", checks: [getColIndex("Замеры")], status: getColIndex("Замеры") + 1 }
  ];

  // Отсекаем ненайденные цеха
  nodes = nodes.filter(function(node) {
    return node.status > 0 && node.checks.every(function(c) { return c > 0; });
  });

  var isNodeActive = function(node, rowData) {
    if (node.type === "checkbox") {
      return node.checks.some(function(cCol) { return rowData[cCol - 1] === true; });
    } else if (node.type === "text") {
      var val = rowData[node.checks[0] - 1];
      return val !== "" && val !== null && val !== undefined && val !== false && val.toString().trim() !== "FALSE";
    }
    return false;
  };

  // 3. Пакетный сбор данных измененных строк
  var allRowsData = sheet.getRange(startRow, 1, numRows, maxColumns).getValues();
  var editedValues = range.getValues();

  for (var i = 0; i < numRows; i++) {
    var currentRow = startRow + i;
    if (currentRow <= 2) continue; 

    var rowData = allRowsData[i];
    var targetColIndex = startCol - startCol; 
    var rawValue = (editedValues[i] && editedValues[i][targetColIndex] !== undefined) 
                   ? editedValues[i][targetColIndex].toString().trim() 
                   : "";

    var isStatusEdited = (startCol <= statusCol && statusCol < startCol + numCols);
    if (isStatusEdited) {
      rawValue = rowData[statusCol - 1].toString().trim();
    }

    // 4. ЛОГИКА: АВТОДАТА
    if (isStatusEdited && rawValue !== "") {
      if (dateCol > 0 && (rowData[dateCol - 1] === "" || rowData[dateCol - 1] === null)) {
        var now = new Date();
        var months = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
        var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd") + " " + months[now.getMonth()];
        sheet.getRange(currentRow, dateCol).setValue(dateStr);
        rowData[dateCol - 1] = dateStr; 
      }
    }

    // 5. ЛОГИКА: СВЕРХУ ВНИЗ
    if (isStatusEdited) {
      if (rawValue === "В работе") {
        nodes.forEach(function(node) {
          var isActive = isNodeActive(node, rowData);
          var currentNodeStatus = rowData[node.status - 1].toString().trim();
          if (isActive && currentNodeStatus === "") {
            sheet.getRange(currentRow, node.status).setValue("В работе");
            rowData[node.status - 1] = "В работе"; 
          }
        });
      }
      else if (rawValue === "Готово" || rawValue === "Отгружено") {
        nodes.forEach(function(node) {
          var isActive = isNodeActive(node, rowData);
          var currentNodeStatus = rowData[node.status - 1].toString().trim();
          if (isActive && currentNodeStatus !== "Выполнено") {
            sheet.getRange(currentRow, node.status).setValue("Выполнено");
            rowData[node.status - 1] = "Выполнено"; 
          }
        });
      }
    }

    // 6. ЛОГИКА: СНИЗУ ВВЕРХ
    var isNodeStatusEdited = nodes.some(function(node) { 
      return (startCol <= node.status && node.status < startCol + numCols); 
    });

    if (isNodeStatusEdited) {
      var currentMainStatus = rowData[statusCol - 1].toString().trim();

      if (currentMainStatus === "" || currentMainStatus === "Ожидание" || currentMainStatus === "Готово" || currentMainStatus === "Отгружено") {
        continue; 
      }

      var allCheckedDone = true;       
      var atLeastOneDone = false;      
      var atLeastOneInProcess = false; 
      var atLeastOneInWork = false;    
      var hasAnyCheck = false;         

      nodes.forEach(function(node) {
        var isActive = isNodeActive(node, rowData);
        if (isActive) {
          hasAnyCheck = true;
          var nodeStatus = rowData[node.status - 1].toString().trim();
          
          if (nodeStatus !== "Выполнено") {
            allCheckedDone = false; 
          }
          if (nodeStatus === "Выполнено") {
            atLeastOneDone = true;  
          }
          if (nodeStatus === "В процессе") {
            atLeastOneInProcess = true;
          }
          if (nodeStatus === "В работе") {
            atLeastOneInWork = true;
          }
        }
      });
      
      if (hasAnyCheck) {
        if (allCheckedDone) {
          if (currentMainStatus !== "ОТК") sheet.getRange(currentRow, statusCol).setValue("ОТК");
        } else if (atLeastOneInProcess || atLeastOneDone) {
          if (currentMainStatus !== "В процессе" && currentMainStatus !== "ОТК") {
            sheet.getRange(currentRow, statusCol).setValue("В процессе");
          }
        } else if (atLeastOneInWork) {
          if (currentMainStatus !== "В работе") sheet.getRange(currentRow, statusCol).setValue("В работе");
        }
      }
    }
  }
}