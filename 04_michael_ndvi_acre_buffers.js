// ============================================================
// HURRICANE MICHAEL — NDVI EXTRACTION WITH ACRE-BASED BUFFERS
// Author: Nazrina Haque
// Description: Buffers each parcel by its acreage before
//              extracting NDVI difference values
//              Buffer radius = sqrt(acres * 4046.86 / pi)
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
// 6. LOAD PARCELS
// ============================================================
var parcels = ee.FeatureCollection(
  "projects/ee-haquen/assets/Data_for_regression"
);

Map.addLayer(parcels, {}, 'Parcels');


// ============================================================
// 7. CREATE ACRE-BASED BUFFERS
// 1 acre = 4046.86 m²
// Circular buffer: area = π * r² → r = sqrt(area / π)
// ============================================================
var bufferedParcels = parcels.map(function(feature) {
  var acres        = ee.Number(feature.get('acres'));
  var bufferRadius = acres.multiply(4046.86)
                         .divide(Math.PI)
                         .sqrt();
  return feature.setGeometry(
    feature.geometry().buffer(bufferRadius)
  );
});

Map.addLayer(bufferedParcels, {}, 'Buffered Parcels');


// ============================================================
// 8. EXTRACT NDVI DIFFERENCE PER BUFFER
// ============================================================
var bufferedParcelsWithNDVI = bufferedParcels.map(function(feature) {
  var ndviValue = ndviDiff.reduceRegion({
    reducer:   ee.Reducer.mean(),
    geometry:  feature.geometry(),
    scale:     30
  }).get('NDVI_Diff');
  return feature.set('NDVI_Diff', ndviValue);
});


// ============================================================
// 9. EXPORT CSV
// ============================================================
Export.table.toDrive({
  collection:  bufferedParcelsWithNDVI,
  description: 'Buffered_Parcels_NDVI_Difference',
  fileFormat:  'CSV'
});
