// Query Selectors
const modal = document.getElementById('modal');
const postcodeBtn = document.getElementById('postcode-btn');
const postcodeInput = document.getElementById('postcode');
const activitySearch = document.getElementById('activity-search');
const searchAgain = document.getElementById('search')
const loadingScreen = document.getElementById('loading')
const updateLoading = document.getElementById('updateLoading')

// Function to show the modal
function showModal() {
  modal.style.display = 'flex';
}

// Function to hide the modal
function hideModal() {
  modal.style.display = 'none';
}

// Function to show loading screen
function showLoadingScreen() {
  loadingScreen.style.display = 'flex';
}

// Function to hide loading screen
function hideLoadingScreen() {
  loadingScreen.style.display = 'none';
}

hideLoadingScreen();

// Initialize Leaflet map
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

// Convert CSV into JSON for the data.
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

// Retrieve the CSV data and convert it to JSON
async function getCsvData() {
  try {
    const response = await fetch('./CroydonReport.csv');
    const csvData = await response.text();
    const jsonData = csvToJson(csvData);
    return jsonData;
  } catch (error) {
    console.error('Error fetching CSV file:', error);
    return null;
  }
}

// Filter the data based on the conditions
function filterData(jsonData, selectedCategories) {
  return jsonData.filter(data => {
    return (
      data['Activity Post Code'].length > 5 &&
      data['Activity Post Code'].length <= 8 &&
      data['Activity Post Code'] !== null &&
      selectedCategories.includes(data['Category(s)'])
    );
  });
}

// Update loading screen as activity matches are found

function updateLoadingScreen() {
  updateLoading.innerHTML = `<p>Currently found ${activityCounter} activities nearby`
}

// Handle submission form and extract the postcode and selected categories
activitySearch.addEventListener('submit', async function(event) {
  event.preventDefault();

  hideModal();
  
  showLoadingScreen();

  const markers = L.markerClusterGroup(); // Create a marker cluster group

  const selectedCategories = Array.from(document.querySelectorAll("input[name=categories]:checked")).map(checkbox => checkbox.value);

  const jsonData = await getCsvData();
  if (!jsonData) {
    return; // Handle the error case
  }

  const filteredData = filterData(jsonData, selectedCategories);

  // Fetch postcode data, plot markers, and perform other map-related operations
  async function addActivitiesToMap() {
    
    try {
      
      // Clear existing markers
      markers.clearLayers();

      activityCounter = 0;

      
      await Promise.all(filteredData.map(async (data) => {
        const postcodeResponse = await fetch(`https://findthatpostcode.uk/postcodes/${data['Activity Post Code']}.json`);
        const postcodeData = await postcodeResponse.json();

        const lat = postcodeData?.data?.attributes?.location?.lat;
        const lng = postcodeData?.data?.attributes?.location?.lon;

        if (
          lat > boundingBox.bottom &&
          lat < boundingBox.topper &&
          lng > boundingBox.left &&
          lng < boundingBox.right
        ) {
          activityCounter += 1;
          updateLoadingScreen();

          let marker = L.marker([lat, lng]);

          // Show popup on hover
          marker.on('mouseover', function(e) {
            this.openPopup();
          });

          // Hide popup on mouseout
          marker.getPopup('mouseout', function(e) {
            this.closePopup();
          });

          
          markers.addLayer(marker); // Add marker to the cluster group

          const keyToFind = 'Link ';
          const linkKey = Object.keys(data).find(key => key.toLowerCase().trim() === keyToFind.toLowerCase().trim());

          marker.bindPopup(
            `<div class="marker-info">
               <div class="marker-info-element"><h4>${data['Activity Name']}</h4></div>
               <hr>
               <div class="marker-info-element"><h4>Organisaton:</h4>${data['Service Provider Name']}</div>
               <hr>
               <div class="marker-info-element"><h4>Age Group:</h4> ${data['Age Group(s)'] == '' ? 'All Ages' : data['Age Group(s)']}</div>
               <hr>
               <div class="marker-info-element"><h4>Category:</h4> ${data['Category(s)']}</div>
               <hr>
               <div class="marker-info-element"><h4>Contact:</h4> ${data['Contact Email'] == undefined ? data['Service Provider Email Address'] : data['Contact Email']}</div>
               <br>
               <a href="${data[linkKey]}" target="_blank"><button>Find Out More</button></a>
            </div>`
          );
        }
      }));

      if (activityCounter === 0) {
        alert('Sorry, there were no activities found nearby. Please type in a postcode within the Croydon area.');
        showModal();
      } 

      map.addLayer(markers); // Add the marker cluster group to the map
    } catch (error) {
      console.error('Error fetching postcode data:', error);
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

      boundingBox.left = lng - 0.028;
      boundingBox.bottom = lat - 0.016;
      boundingBox.right = lng + 0.028;
      boundingBox.topper = lat + 0.016;

      let mapBounds = [[boundingBox.bottom, boundingBox.left], [boundingBox.topper, boundingBox.right]];
      map.fitBounds(mapBounds);

      await addActivitiesToMap();

      hideLoadingScreen();

    } catch (error) {
      alert('Please enter a valid postcode', error);
      showModal();
      hideLoadingScreen();
      
    }
  }

  findUserPostCode(postcodeInput.value);
});

searchAgain.addEventListener('click', function() {
  showModal();
})