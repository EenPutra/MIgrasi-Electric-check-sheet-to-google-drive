// ============================================================
//  EIC7 CheckSheets — Apps Script Backend
//  Google Sheets/Drive replacement for Firebase Firestore.
//  Deploy as standalone Web App (not container-bound).
// ============================================================

const ROOT_FOLDER_ID = '1FxT9LM6ABuNnD6KFWwTWCsTWGBYMEC_r';
const MASTER_INDEX_ID = '1D_-B7Z2MzQxx1ML69iSNIW1jPcnx6dLmVzWQ1Taj5us';

const CHECKSHEETS = {
  '7EPLCB4_Maintenance':          { dataSheetId: '1iM1Q6gtbhwD5tX8Wx4TvU8sirysrhaPkxU4vvl9BTqI', photosFolderId: '1-bem0x3zIVdA8FvMN-dA-XY5PHOH2TJU' },
  '7EPMCC_Maintenance':           { dataSheetId: '10c3Vd583o3-1KSzj8H7zYAUY6REMozE2VlWfYgDv6i0', photosFolderId: '1eztIuy1WcUCcO6yxtPGE8BrJbTYi386y' },
  'Battery_7EB-BY-125-250':       { dataSheetId: '1TP3B8H-b2EAPtlxc_R1wp877lLRY0emevPyICKpuI2o', photosFolderId: '1NRv9dl5Hl_ZZevrUyp7hzwZQe0Y3_fDJ' },
  'DRY_TRAFO_PM':                 { dataSheetId: '1ambQTWQWG69OmgqSjvnVCcznZ5QTTeaPa6bUdjl45PA', photosFolderId: '17WPOlxDNUkjJMUqeidDXTmQ37TQXssIu' },
  'ESP_7BGPCP800A_B':             { dataSheetId: '1KR47eWnDkPh43dsR383BEBnnDgnoeIWUw0MQLUdOc4U', photosFolderId: '15TzAeFh0f7zE8QvQ7ke60ssNfWiJ7fIn' },
  'GEN_BrushGear_PM_Checksheet':  { dataSheetId: '1O8beVeyZr39CWLI7Nf11huVLoDI7QYrkdZkMiJuF3SE', photosFolderId: '18Ihv0ePWvVg5p4ZcAVrrWTAi9GKGl0oz' },
  'HV_Motor_6Monthly_PM':         { dataSheetId: '1fnEOHUqokujMlwgL7GMCSoG-2S0WqmB89nUaZsePDs4', photosFolderId: '1FXjfpgRWTCzyy78r59MeI8CkKDVNXAxn' },
  'HV_Motor_SWGR':                { dataSheetId: '1wrSNVYpscny-XFhXxihLpBLkqDMe-iJPWuOoC0n9Ojs', photosFolderId: '1AYEhRRmkfWHVr2Q_UYpQAfWppeUoQ_cJ' },
  'Hoist_Inspection_Maintenance': { dataSheetId: '1_i34nH5jdxLJEKI3zcEc2fCSTzQegkaBxK3raWMacDA', photosFolderId: '1cRSX9IrMwIzKV3nmKtTW2wsHEIkG9tW1' },
  'LV_Motor_MCC':                 { dataSheetId: '1-YgS6YDVNyihN3iYWkYM10IA3FNxODL7dJInzDufeIE', photosFolderId: '1sAxarLKaIvTsQ-KnfQPcsAFVuRImKp51' },
  'PM_CheckSheet_BYC125':         { dataSheetId: '1CwUVL8U1GIoio10dK4J8rqtWVys6yu3dZH5R4XtPNDg', photosFolderId: '1Px-g3SRWL2bnRdLCuJTsxJnWFkXO9UWz' },
  'Transformer_Weekly_Inspection':{ dataSheetId: '1u14HSUans8cN0fjHcuP4XaCj66X9HcGSVznPgqFB4jE', photosFolderId: '1Wu70NMvbTk1EKiWonPB-0uyBV987R8sM' },
  'UPS_7EB-UPS-AB_Monthly':       { dataSheetId: '1z9eM5LpoY0ceWOVKS85oEQeMYK-A-1TFaAcO3TGCMVk', photosFolderId: '1lKmBN0t583aFWyjBVyRM0jj9TPjIJVfV' },
  'Work_Activity_Record':         { dataSheetId: '1MrFOIVAIYKoNjqsqa4dgMZfFgGGhJ2RBPZJkGmbXQxc', photosFolderId: '1xeOzeUQiQxFMXNUt5tvjQ2y3Y7LNr24S' }
};

const CHECKSHEET_HEADER = ['id','assetTag','assetName','frequency','woNumber','executionDate','timeStart','timeEnd','checkedBy','nik','reviewedBy','shift','overallStatus','countOk','countNg','countNa','items','measurements','toggleStates','inputValues','findings','recommendations','photos','photoCount','createdAt','submittedAt'];
const WAR_HEADER = ['id','asset','desc','woNumber','woDate','failureDesc','pic','conclusion','recommendations','blocks','photos','photoCount','createdAt'];
const MASTER_INDEX_HEADER = ['id','checksheetType','assetTag','assetName','frequency','executionDate','checkedBy','overallStatus','photoCount','detailSheetId','createdAt'];

// ── Run this once manually from the Apps Script editor after pasting this file. ──
// The Drive folders/sheets were created via a CSV import that left the header
// on row 2 instead of row 1 — this normalizes row 1 on every sheet and drops
// the leftover duplicate row.
function setupHeaders() {
  Object.keys(CHECKSHEETS).forEach(type => {
    const header = type === 'Work_Activity_Record' ? WAR_HEADER : CHECKSHEET_HEADER;
    normalizeHeader_(CHECKSHEETS[type].dataSheetId, header);
  });
  normalizeHeader_(MASTER_INDEX_ID, MASTER_INDEX_HEADER);
}

function normalizeHeader_(sheetId, header) {
  const sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.setFrozenRows(1);
  const row2 = sheet.getRange(2, 1, 1, header.length).getValues()[0];
  if (row2.join(',') === header.join(',')) {
    sheet.deleteRow(2);
  }
}

// ============================================================
//  doGet — list MASTER_INDEX (optionally filtered), or one detail row
//  ?action=list&assetTag=..&checksheetType=..&status=..
//  ?action=detail&checksheetType=..&id=..
// ============================================================
function doGet(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'list';
    if (action === 'list') return respond_(listIndex_(e.parameter));
    if (action === 'detail') return respond_(getDetail_(e.parameter.checksheetType, e.parameter.id));
    return respond_({ error: 'Unknown action: ' + action });
  } catch (err) {
    return respond_({ error: err.message });
  }
}

function listIndex_(params) {
  const sheet = SpreadsheetApp.openById(MASTER_INDEX_ID).getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const header = values[0];
  let rows = values.slice(1).map(r => rowToObject_(header, r));
  if (params.assetTag) rows = rows.filter(r => r.assetTag === params.assetTag);
  if (params.checksheetType) rows = rows.filter(r => r.checksheetType === params.checksheetType);
  if (params.status) rows = rows.filter(r => r.overallStatus === params.status);
  return { rows };
}

function getDetail_(checksheetType, id) {
  const cfg = CHECKSHEETS[checksheetType];
  if (!cfg) throw new Error('Unknown checksheetType: ' + checksheetType);
  const sheet = SpreadsheetApp.openById(cfg.dataSheetId).getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const header = values[0];
  const idCol = header.indexOf('id');
  const row = values.slice(1).find(r => String(r[idCol]) === String(id));
  if (!row) throw new Error('Submission not found: ' + id);
  const obj = rowToObject_(header, row);
  ['items', 'measurements', 'toggleStates', 'inputValues', 'photos', 'blocks'].forEach(f => {
    if (obj[f]) { try { obj[f] = JSON.parse(obj[f]); } catch (e) {} }
  });
  return obj;
}

function rowToObject_(header, row) {
  const obj = {};
  header.forEach((key, i) => obj[key] = row[i]);
  return obj;
}

// ============================================================
//  doPost — submit a new checksheet, upload photos, update MASTER_INDEX
// ============================================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const body = JSON.parse(e.postData.contents);
    const checksheetType = body.checksheetType;
    const cfg = CHECKSHEETS[checksheetType];
    if (!cfg) throw new Error('Unknown checksheetType: ' + checksheetType);

    const id = Utilities.getUuid();
    const now = new Date().toISOString();

    const photoRefs = uploadPhotos_(body.photos || [], cfg.photosFolderId, id);

    const header = checksheetType === 'Work_Activity_Record' ? WAR_HEADER : CHECKSHEET_HEADER;
    const rowObj = Object.assign({}, body, {
      id,
      photos: JSON.stringify(photoRefs),
      photoCount: photoRefs.length,
      createdAt: now,
      submittedAt: now
    });
    ['items', 'measurements', 'toggleStates', 'inputValues', 'blocks'].forEach(f => {
      if (rowObj[f] && typeof rowObj[f] !== 'string') rowObj[f] = JSON.stringify(rowObj[f]);
    });
    const row = header.map(key => rowObj[key] !== undefined ? rowObj[key] : '');

    const sheet = SpreadsheetApp.openById(cfg.dataSheetId).getSheets()[0];
    sheet.appendRow(row);

    appendToMasterIndex_({
      id, checksheetType,
      assetTag: body.assetTag || '',
      assetName: body.assetName || '',
      frequency: body.frequency || '',
      executionDate: body.executionDate || body.woDate || '',
      checkedBy: body.checkedBy || '',
      overallStatus: body.overallStatus || '',
      photoCount: photoRefs.length,
      detailSheetId: cfg.dataSheetId,
      createdAt: now
    });

    return respond_({ success: true, id });
  } catch (err) {
    return respond_({ success: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

// photos: [{ base64: 'data:image/jpeg;base64,...', mimeType: 'image/jpeg', caption: '...' }]
function uploadPhotos_(photos, folderId, submissionId) {
  if (!photos.length) return [];
  const folder = DriveApp.getFolderById(folderId);
  return photos.map((p, i) => {
    const bytes = Utilities.base64Decode(p.base64.split(',').pop());
    const blob = Utilities.newBlob(bytes, p.mimeType || 'image/jpeg', `${submissionId}_${i + 1}.jpg`);
    const file = folder.createFile(blob);
    return { fileId: file.getId(), caption: p.caption || '' };
  });
}

function appendToMasterIndex_(entry) {
  const sheet = SpreadsheetApp.openById(MASTER_INDEX_ID).getSheets()[0];
  const row = MASTER_INDEX_HEADER.map(key => entry[key] !== undefined ? entry[key] : '');
  sheet.appendRow(row);
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
