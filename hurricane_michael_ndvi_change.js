// ============================================================
// HURRICANE MICHAEL — NDVI CHANGE DETECTION
// Author: Nazrina Haque
// Description: Detects vegetation damage caused by Hurricane
//              Michael (October 2018) using Sentinel-2 NDVI
//              pre/post event comparison across Georgia,
//              Alabama, South Carolina, and Florida
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
// 2. CLOUD MASK FUNCTION (Sentinel-2)
// ============================================================
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Mask clouds (bit 10) and cirrus (bit 11)
  var cloudMask = qa.bitwiseAnd(1 << 10).eq(0)
               .and(qa.bitwiseAnd(1 << 11).eq(0));

  return image.updateMask(cloudMask).divide(10000);
}


// ============================================================
// 3. NDVI FUNCTION (Sentinel-2)
// NIR = B8, Red = B4
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
// 5. DEFINE PRE & POST EVENT PERIODS
// Hurricane Michael landfall: October 10, 2018
// ============================================================
var preStart  = '2018-09-01';
var preEnd    = '2018-10-08'; // Before landfall
var postStart = '2018-10-11';
var postEnd   = '2018-11-30'; // After landfall


// ============================================================
// 6. BUILD PRE & POST COMPOSITES
// ============================================================
var preEvent  = getSentinelCollection(preStart,  preEnd).median().clip(aoi);
var postEvent = getSentinelCollection(postStart, postEnd).median().clip(aoi);


// ============================================================
// 7. CALCULATE NDVI DIFFERENCE
// Negative values = vegetation loss (damage)
// Positive values = vegetation gain (recovery)
// ============================================================
var ndviDiff = postEvent.select('NDVI')
               .subtract(preEvent.select('NDVI'))
               .rename('NDVI_Diff');


// ============================================================
// 8. VISUALIZATION
// ============================================================
var ndviVis = {min: -1,   max: 1,   palette: ['white', 'green']};
var diffVis = {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']};

Map.addLayer(preEvent.select('NDVI'),  ndviVis, 'Pre-Event NDVI  (Sep–Oct 8, 2018)');
Map.addLayer(postEvent.select('NDVI'), ndviVis, 'Post-Event NDVI (Oct 11–Nov 2018)');
Map.addLayer(ndviDiff,                 diffVis, 'NDVI Difference (Post - Pre)');


// ============================================================
// 9. EXPORT NDVI DIFFERENCE RASTER
// ============================================================
Export.image.toDrive({
  image:       ndviDiff,
  description: 'NDVI_Difference_HurricaneMichael_2018',
  scale:       10,           // Sentinel-2 native resolution (meters)
  region:      aoi,
  fileFormat:  'GeoTIFF',
  crs:         'EPSG:4326'   // WGS 84
});
