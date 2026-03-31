// ============================================================
// HURRICANE MICHAEL — NDVI EXTRACTION AT PARCEL LEVEL (30m)
// Author: Nazrina Haque
// Description: Same as 02 but uses 30m resolution and
//              simplified geometries for faster processing
//              Use this version for large parcel datasets
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
// 2. CLOUD MASK & NDVI FUNCTIONS
// ============================================================
function maskS2clouds(image) {
  var qa        = image.select('QA60');
  var cloudMask = qa.bitwiseAnd(1 << 10).eq(0)
               .and(qa.bitwiseAnd(1 << 11).eq(0));
  return image.updateMask(cloudMask).divide(10000);
}

function addNDVI(image) {
  return image.addBands(
    image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  );
}


// ============================================================
// 3. SENTINEL-2 COLLECTION FUNCTION
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
// 4. PRE & POST COMPOSITES
// ============================================================
var preEvent  = getSentinelCollection('2018-09-01', '2018-10-08').median().clip(aoi);
var postEvent = getSentinelCollection('2018-10-11', '2018-11-30').median().clip(aoi);

var ndviDiff  = postEvent.select('NDVI')
                .subtract(preEvent.select('NDVI'))
                .rename('NDVI_Diff');


// ============================================================
// 5. VISUALIZATION
// ============================================================
var ndviVis = {min: -1,   max: 1,   palette: ['white', 'green']};
var diffVis = {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']};

Map.addLayer(preEvent.select('NDVI'),  ndviVis, 'Pre-Event NDVI');
Map.addLayer(postEvent.select('NDVI'), ndviVis, 'Post-Event NDVI');
Map.addLayer(ndviDiff,                 diffVis, 'NDVI Difference');


// ============================================================
// 6. LOAD & SIMPLIFY PARCELS
// Simplify geometries to reduce computation time
// ============================================================
var parcels = ee.FeatureCollection(
  "projects/ee-haquen/assets/Data_for_regression"
);

var simplifiedParcels = parcels.map(function(feature) {
  return feature.simplify(100); // 100-meter tolerance
});

Map.addLayer(parcels, {}, 'Parcels');


// ============================================================
// 7. EXTRACT NDVI DIFFERENCE PER PARCEL (30m resolution)
// ============================================================
var parcelsWithNDVI = parcels.map(function(feature) {
  var ndviValue = ndviDiff.reduceRegion({
    reducer:   ee.Reducer.mean(),
    geometry:  feature.geometry(),
    scale:     30   // Coarser resolution = faster processing
  }).get('NDVI_Diff');
  return feature.set('NDVI_Diff', ndviValue);
});


// ============================================================
// 8. EXPORT CSV
// ============================================================
Export.table.toDrive({
  collection:  parcelsWithNDVI,
  description: 'Parcels_NDVI_Difference_30m',
  fileFormat:  'CSV'
});
