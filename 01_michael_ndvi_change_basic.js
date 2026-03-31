// ============================================================
// HURRICANE MICHAEL — NDVI CHANGE DETECTION (BASIC)
// Author: Nazrina Haque
// Description: Pre/post NDVI comparison around Hurricane
//              Michael landfall (October 10, 2018)
//              Exports NDVI difference raster to Drive
// ============================================================


// ============================================================
// 1. AREA OF INTEREST
// ============================================================
var usStates = ee.FeatureCollection('TIGER/2018/States');

var selectedStates = usStates.filter(
  ee.Filter.inList('NAME', ['Georgia', 'Alabama', 'South Carolina', 'Florida'])
);

var aoi = selectedStates.geometry();
Map.centerObject(aoi, 6);


// ============================================================
// 2. CLOUD MASK FUNCTION
// ============================================================
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var cloudMask = qa.bitwiseAnd(1 << 10).eq(0)
               .and(qa.bitwiseAnd(1 << 11).eq(0));
  return image.updateMask(cloudMask).divide(10000);
}


// ============================================================
// 3. NDVI FUNCTION
// ============================================================
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}


// ============================================================
// 4. SENTINEL-2 COLLECTION FUNCTION
// ============================================================
function getSentinelCollection(startDate, endDate) {
  return ee.ImageCollection('COPERNICUS/S2')
    .filterBounds(aoi)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .map(maskS2clouds)
    .map(addNDVI);
}


// ============================================================
// 5. PRE & POST EVENT PERIODS
// Hurricane Michael landfall: October 10, 2018
// ============================================================
var preStart  = '2018-09-01';
var preEnd    = '2018-10-08';
var postStart = '2018-10-11';
var postEnd   = '2018-11-30';


// ============================================================
// 6. BUILD COMPOSITES & NDVI DIFFERENCE
// ============================================================
var preEvent  = getSentinelCollection(preStart,  preEnd).median().clip(aoi);
var postEvent = getSentinelCollection(postStart, postEnd).median().clip(aoi);

var ndviDiff  = postEvent.select('NDVI')
                .subtract(preEvent.select('NDVI'))
                .rename('NDVI_Diff');


// ============================================================
// 7. VISUALIZATION
// ============================================================
var ndviVis = {min: -1,   max: 1,   palette: ['white', 'green']};
var diffVis = {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']};

Map.addLayer(preEvent.select('NDVI'),  ndviVis, 'Pre-Event NDVI');
Map.addLayer(postEvent.select('NDVI'), ndviVis, 'Post-Event NDVI');
Map.addLayer(ndviDiff,                 diffVis, 'NDVI Difference');


// ============================================================
// 8. EXPORT NDVI DIFFERENCE RASTER
// ============================================================
Export.image.toDrive({
  image:       ndviDiff,
  description: 'NDVI_Difference_HurricaneMichael_2018',
  scale:       10,
  region:      aoi,
  fileFormat:  'GeoTIFF',
  crs:         'EPSG:4326'
});
