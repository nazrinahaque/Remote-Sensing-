// =======================
// 1. AREA OF INTEREST
// =======================
var usStates = ee.FeatureCollection('TIGER/2018/States');

var selectedStates = usStates.filter(
  ee.Filter.inList('NAME', ['Georgia', 'Alabama', 'South Carolina', 'Florida'])
);

var aoi = selectedStates.geometry();
Map.centerObject(aoi, 6);


// =======================
// 2. CLOUD MASK + NDVI
// =======================
function maskS2clouds(image) {

  var opaque  = image.select('MSK_CLASSI_OPAQUE').eq(0);
  var cirrus  = image.select('MSK_CLASSI_CIRRUS').eq(0);

  var mask = opaque.and(cirrus);

  return image.updateMask(mask).divide(10000);
}

function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}


// =======================
// 3. FUNCTION: ANNUAL NDVI
// =======================
function getAnnualNDVI(year) {

  var start = ee.Date.fromYMD(year, 1, 1);
  var end   = ee.Date.fromYMD(year, 12, 31);

  var collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(aoi)
      .filterDate(start, end)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map(maskS2clouds)
      .map(addNDVI);

  return collection.select('NDVI').median().clip(aoi);
}


// =======================
// 4. NDVI 2019 vs 2024
// =======================
var ndvi2019 = getAnnualNDVI(2019);
var ndvi2024 = getAnnualNDVI(2024);

var ndviDiff = ndvi2024.subtract(ndvi2019).rename('NDVI_Diff');


// =======================
// 5. VISUALIZATION
// =======================
var ndviVis = {min: 0, max: 1, palette: ['white', 'green']};
var diffVis = {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']};

Map.addLayer(ndvi2019, ndviVis, 'NDVI 2019');
Map.addLayer(ndvi2024, ndviVis, 'NDVI 2024');
Map.addLayer(ndviDiff, diffVis, 'NDVI Difference');


// =======================
// 6. LOAD PARCEL POINTS
// =======================
var parcels = ee.FeatureCollection("projects/ee-nazrinahaque/assets/Cheap_sales");

Map.addLayer(parcels, {}, 'Parcel Points');


// =======================
// 7. BUFFER BY ACRES
// =======================
var bufferedParcels = parcels.map(function(feature) {

  var acres = ee.Number(feature.get('acres'));

  // Convert acres → radius in meters
  var radius = acres.multiply(4046.86).divide(Math.PI).sqrt();

  return feature.buffer(radius);
});

Map.addLayer(bufferedParcels, {}, 'Buffered Parcels');


// =======================
// 8. EXTRACT NDVI DIFFERENCE
// =======================
var parcelsWithNDVI = bufferedParcels.map(function(feature) {

  var ndviValue = ndviDiff.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: feature.geometry(),
    scale: 30,
    maxPixels: 1e9
  }).get('NDVI_Diff');

  return feature.set('NDVI_Diff', ndviValue);
});


// =======================
// 9. EXPORT TABLE
// =======================
Export.table.toDrive({
  collection: parcelsWithNDVI,
  description: 'CheapSales_NDVI_Diff_2024_2019',
  fileFormat: 'CSV'
});


//second format
// ======================================
// 1. AREA OF INTEREST (SE United States)
// ======================================
var usStates = ee.FeatureCollection('TIGER/2018/States');

var selectedStates = usStates.filter(
  ee.Filter.inList('NAME', ['Georgia', 'Alabama', 'South Carolina', 'Florida'])
);

var aoi = selectedStates.geometry();
Map.centerObject(aoi, 6);


// ======================================
// 2. CLOUD MASK + NDVI (Sentinel-2 SR)
// ======================================
function maskS2(image) {
  var opaque = image.select('MSK_CLASSI_OPAQUE').eq(0);
  var cirrus = image.select('MSK_CLASSI_CIRRUS').eq(0);
  return image.updateMask(opaque.and(cirrus)).divide(10000);
}

function addNDVI(image) {
  return image.addBands(
    image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  );
}


// ======================================
// 3. FUNCTION: ANNUAL NDVI COMPOSITE
// ======================================
function annualNDVI(year) {

  var start = ee.Date.fromYMD(year, 1, 1);
  var end   = ee.Date.fromYMD(year, 12, 31);

  var img = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskS2)
    .map(addNDVI)
    .select('NDVI')
    .median()
    .clip(aoi);

  return img;
}


// ======================================
// 4. BUILD NDVI YEARS
// ======================================
var ndvi2017 = annualNDVI(2017); // pre-hurricane baseline
var ndvi2019 = annualNDVI(2019); // post-damage
var ndvi2024 = annualNDVI(2024); // recovery / development


// ======================================
// 5. DERIVED RECOVERY METRICS
// ======================================
var damage        = ndvi2019.subtract(ndvi2017).rename('damage');
var recovery      = ndvi2024.subtract(ndvi2019).rename('recovery');
var fullRecovery  = ndvi2024.subtract(ndvi2017).rename('full_recovery');

// Percent recovery = (2024 − 2019) / (2017 − 2019)
var percentRecovery = recovery
  .divide(ndvi2017.subtract(ndvi2019))
  .rename('pct_recovery');


// ======================================
// 6. VISUALIZATION
// ======================================
var ndviVis = {min: 0, max: 1, palette: ['white', 'green']};
var diffVis = {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']};

Map.addLayer(ndvi2017, ndviVis, 'NDVI 2017');
Map.addLayer(ndvi2019, ndviVis, 'NDVI 2019');
Map.addLayer(ndvi2024, ndviVis, 'NDVI 2024');
Map.addLayer(fullRecovery, diffVis, 'Full Recovery 2024-2017');


// ======================================
// 7. LOAD Cheap_sales PARCEL POINTS
// ======================================
var parcels = ee.FeatureCollection(
  "projects/ee-nazrinahaque/assets/Cheap_sales"
);

Map.addLayer(parcels, {}, 'Parcel Points');


// ======================================
// 8. BUFFER PARCELS USING ACRES
// ======================================
var buffered = parcels.map(function(f) {

  var acres = ee.Number(f.get('acres'));

  // Convert acres → radius (meters)
  var radius = acres.multiply(4046.86).divide(Math.PI).sqrt();

  return f.buffer(radius);
});

Map.addLayer(buffered, {}, 'Buffered Parcels');


// ======================================
// 9. STACK METRICS INTO ONE IMAGE
// ======================================
var metricsImage = damage
  .addBands(recovery)
  .addBands(fullRecovery)
  .addBands(percentRecovery);


// ======================================
// 10. EXTRACT PARCEL-LEVEL VALUES
// ======================================
var parcelMetrics = buffered.map(function(f) {

  var vals = metricsImage.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: f.geometry(),
    scale: 30,
    maxPixels: 1e9
  });

  return f.set(vals);
});


// ======================================
// 11. EXPORT REGRESSION-READY CSV
// ======================================
Export.table.toDrive({
  collection: parcelMetrics,
  description: 'Hurricane_Recovery_Metrics_2017_2019_2024',
  fileFormat: 'CSV'
});
// =====================================================
// 1. AREA OF INTEREST
// =====================================================
var states = ee.FeatureCollection('TIGER/2018/States');

var selectedStates = states.filter(
  ee.Filter.inList('NAME', [
    'Georgia',
    'Alabama',
    'South Carolina',
    'Florida'
  ])
);

var aoi = selectedStates.geometry();


// =====================================================
// 2. CLOUD MASK + NDVI
// =====================================================
function maskS2(image) {
  var opaque = image.select('MSK_CLASSI_OPAQUE').eq(0);
  var cirrus = image.select('MSK_CLASSI_CIRRUS').eq(0);
  return image.updateMask(opaque.and(cirrus)).divide(10000);
}

function addNDVI(image) {
  return image.addBands(
    image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  );
}


// =====================================================
// 3. ANNUAL NDVI FUNCTION
// =====================================================
function annualNDVI(year) {

  var start = ee.Date(year + '-01-01');
  var end   = ee.Date(year + '-12-31');

  var collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(aoi)
      .filterDate(start, end)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .map(maskS2)
      .map(addNDVI)
      .select('NDVI');

  return collection.median().clip(aoi);
}


// =====================================================
// 4. BUILD NDVI YEARS
// =====================================================
var ndvi2019 = annualNDVI(2019);
var ndvi2024 = annualNDVI(2024);


// =====================================================
// 5. NDVI DIFFERENCE
// =====================================================
var ndviDiff = ndvi2024.subtract(ndvi2019)
                       .rename('NDVI_Diff');

Map.addLayer(ndviDiff,
  {min:-0.5, max:0.5, palette:['red','white','green']},
  'NDVI Difference (2024-2019)'
);


// =====================================================
// 6. LOAD Ndvi_recovery TABLE
// =====================================================
var parcels = ee.FeatureCollection(
  "projects/ee-haquen/assets/Ndvi_recovery"
);


// =====================================================
// 7. BUFFER USING ACRES
// =====================================================
var buffered = parcels.map(function(f) {

  var acres  = ee.Number(f.get('acres'));

  var radius = acres
      .multiply(4046.86)
      .divide(Math.PI)
      .sqrt();

  return f.buffer(radius);
});


// =====================================================
// 8. EXTRACT MEAN NDVI DIFFERENCE
// =====================================================
var parcelsWithNDVI = buffered.map(function(feature) {

  var stats = ndviDiff.reduceRegion({
     reducer: ee.Reducer.mean(),
    geometry: feature.geometry(),
    scale: 30,
    maxPixels: 1e9,
    tileScale: 4
  });

  return feature.set(stats);
});


// =====================================================
// 9. EXPORT
// =====================================================
Export.table.toDrive({
  collection:  parcelsWithNDVI,
  description: 'Ndvi_Difference_2024_2019',
  fileFormat:  'CSV'
});
// ======================================
// 1. AREA OF INTEREST (SE United States)
// ======================================
var usStates = ee.FeatureCollection('TIGER/2018/States');

var selectedStates = usStates.filter(
  ee.Filter.inList('NAME', ['Georgia', 'Alabama', 'South Carolina', 'Florida'])
);

var aoi = selectedStates.geometry();
Map.centerObject(aoi, 6);


// ======================================
// 2. CLOUD MASK + NDVI (Sentinel-2 SR)
// ======================================
function maskS2(image) {
  var opaque = image.select('MSK_CLASSI_OPAQUE').eq(0);
  var cirrus = image.select('MSK_CLASSI_CIRRUS').eq(0);
  return image.updateMask(opaque.and(cirrus)).divide(10000);
}

function addNDVI(image) {
  return image.addBands(
    image.normalizedDifference(['B8', 'B4']).rename('NDVI')
  );
}


// ======================================
// 3. FUNCTION: ANNUAL NDVI COMPOSITE
// ======================================
function annualNDVI(year) {

  var start = ee.Date.fromYMD(year, 1, 1);
  var end   = ee.Date.fromYMD(year, 12, 31);

  var img = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskS2)
    .map(addNDVI)
    .select('NDVI')
    .median()
    .clip(aoi);

  return img;
}


// ======================================
// 4. BUILD NDVI YEARS
// ======================================
var ndvi2017 = annualNDVI(2017);
var ndvi2019 = annualNDVI(2019);
var ndvi2024 = annualNDVI(2024);


// ======================================
// 5. DERIVED RECOVERY METRICS
// ======================================
var damage        = ndvi2019.subtract(ndvi2017).rename('damage');
var recovery      = ndvi2024.subtract(ndvi2019).rename('recovery');
var fullRecovery  = ndvi2024.subtract(ndvi2017).rename('full_recovery');

var percentRecovery = recovery
  .divide(ndvi2017.subtract(ndvi2019))
  .rename('pct_recovery');


// ======================================
// 6. VISUALIZATION
// ======================================
var ndviVis = {min: 0, max: 1, palette: ['white', 'green']};
var diffVis = {min: -0.5, max: 0.5, palette: ['red', 'white', 'green']};

Map.addLayer(ndvi2017, ndviVis, 'NDVI 2017');
Map.addLayer(ndvi2019, ndviVis, 'NDVI 2019');
Map.addLayer(ndvi2024, ndviVis, 'NDVI 2024');
Map.addLayer(fullRecovery, diffVis, 'Full Recovery 2024-2017');


// ======================================
// 7. LOAD NEW TABLE: Ndvi_recovery
// ======================================
var parcels = ee.FeatureCollection(
  "projects/ee-haquen/assets/Ndvi_recovery"
);

Map.addLayer(parcels, {}, 'Ndvi_recovery Points');


// ======================================
// 8. BUFFER USING ACRES
// ======================================
var buffered = parcels.map(function(f) {

  var acres = ee.Number(f.get('acres'));
  var radius = acres.multiply(4046.86).divide(Math.PI).sqrt();

  return f.buffer(radius);
});

Map.addLayer(buffered, {}, 'Buffered Ndvi_recovery Parcels');


// ======================================
// 9. STACK METRICS
// ======================================
var metricsImage = damage
  .addBands(recovery)
  .addBands(fullRecovery)
  .addBands(percentRecovery);


// ======================================
// 10. EXTRACT PARCEL-LEVEL VALUES
// ======================================
var parcelMetrics = buffered.map(function(f) {

  var vals = metricsImage.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: f.geometry(),
    scale: 30,
    maxPixels: 1e9
  });

  return f.set(vals);
});


// ======================================
// 11. EXPORT CSV
// ======================================
Export.table.toDrive({
  collection: parcelMetrics,
  description: 'Ndvi_recovery_Metrics_2017_2019_2024',
  fileFormat: 'CSV'
});
# Remote-Sensing-
