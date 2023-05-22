// Query Selectors
const postcodeBtn = document.getElementById('postcode-btn');

// Add map
let map = L.map('map').setView([51.376086, -0.095595], 17);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Global Variables
const boundingBox = {
  left: 0,
  bottom: 0,
  right: 0,
  topper: 0
};
let activityCounter = 0;

// Convert CSV into JSON
function csvToJson(csv) {
    const lines = csv.split('\n');
    const result = [];

    const headers = lines[0].split(',');
    for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentLine = lines[i].split(',');

    for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentLine[j];
    }

    result.push(obj);
    }

    return result;
}

// Fetch CSV data and convert it to JSON and iterate and plot markers based on the activity.
async function addActivitiesToMap() {
    try {
      const response = await fetch('./CroydonReport.csv');
      const csvData = await response.text();
      const jsonData = csvToJson(csvData);
  
      console.log(jsonData);
  
      await Promise.all(jsonData.map(async (data) => {
        if (
          data['Activity Post Code'].length > 5 &&
          data['Activity Post Code'].length <= 8 &&
          data['Activity Post Code'] !== null
        ) {
          const postcodeResponse = await fetch(
            `https://findthatpostcode.uk/postcodes/${data['Activity Post Code']}.json`
          );
          const postcodeData = await postcodeResponse.json();
  
          // Add markers
          const lat = postcodeData?.data?.attributes?.location?.lat;
          const lng = postcodeData?.data?.attributes?.location?.lon;
  
          if (
            lat > boundingBox.bottom &&
            lat < boundingBox.topper &&
            lng > boundingBox.left &&
            lng < boundingBox.right
          ) {
            activityCounter += 1;
  
            let marker = L.marker([lat, lng]).addTo(map);
            // Fix error where url Link key is coming up undefined
            const keyToFind = 'Link ';
  
            const linkKey = Object.keys(data).find(
              (key) =>
                key.toLowerCase().trim() === keyToFind.toLowerCase().trim()
            );
  
            marker.bindPopup(
              `<div class="marker-info">
                 <div class="marker-info-element"><h4>${data['Activity Name']}</h4></div>
                 <hr>
                 <div class="marker-info-element"><h4>Organisaton:</h4>${data['Service Provider Name']}</div>
                 <hr>
                 <div class="marker-info-element"><h4>Age Group:</h4> ${
                   data['Age Group(s)'] == '' ? 'All Ages' : data['Age Group(s)']
                 }</div>
                 <hr>
                 <div class="marker-info-element"><h4>Category:</h4> ${
                   data['Category(s)']
                 }</div>
                 <hr>
                 <div class="marker-info-element"><h4>Contact:</h4> ${
                   data['Contact Email'] == undefined
                     ? data['Service Provider Email Address']
                     : data['Contact Email']
                 }</div>
                 <br>
                 <a href="${data[linkKey]}" target="_blank"><button>Find Out More</button></a>
              </div>`
            );
          }
        }
      }));
  
      if (activityCounter === 0) {
        alert(
          'Sorry, there were no activities found nearby. Please type in a postcode within the Croydon area.'
        );
      } else if (activityCounter > 0) {
        console.log('Works');
      }
    } catch (error) {
      console.error('Error fetching CSV file:', error);
    }
  }

// Convert user Postcode to longitude and latitude using FindThatPostCode API and run the plot marker function when the user types in their postcode.
async function findUserPostCode(postcode) {
  try {
    const response = await fetch(`https://findthatpostcode.uk/postcodes/${postcode}.json`);
    if (!response.ok) {
        throw new Error('Invalid postcode or postcode not found.');
      }
    const data = await response.json();
    const lat = data?.data?.attributes?.location?.lat;
    const lng = data?.data?.attributes?.location?.lon;

    let currentLocation = L.icon({
      iconUrl: 'img/myLocation.png',
      iconSize: [60, 60],
      iconAnchor: [30, 30],
      popupAnchor: [0, -10]
    });

    let marker = L.marker([lat, lng], { icon: currentLocation }).addTo(map);

    marker.bindPopup('You are here').openPopup();
    map.setView([lat, lng], 14);

    // Update bounding box
    boundingBox.left = lng - 0.028;
    boundingBox.bottom = lat - 0.016;
    boundingBox.right = lng + 0.028;
    boundingBox.topper = lat + 0.016;

    let mapBounds = [[boundingBox.bottom, boundingBox.left], [boundingBox.topper, boundingBox.right]];
    map.fitBounds(mapBounds);

    await addActivitiesToMap();
  } catch (error) {
    console.error('Error fetching postcode data:', error);
  }
}

postcodeBtn.addEventListener("click", function () {
  const postcodeVal = document.querySelector('input').value;
  findUserPostCode(postcodeVal);
});