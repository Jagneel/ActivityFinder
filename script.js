// Query Selectors
const postcodeBtn = document.getElementById('postcode-btn');
let postcodeVal = document.querySelector('input').value;


// Add map
let map = L.map('map').setView([51.376086, -0.095595], 17);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Layer Groups
let activityLayer = L.layerGroup();
let foodBanks = L.layerGroup();
let socialCare = L.layerGroup();
let extraCurricular = L.layerGroup();
let myLocation = L.layerGroup();

//Marker Groups
let activityGroup = L.markerClusterGroup();

// Layer controls
let overlays = {
    "Activities": activityLayer,
    "Food Banks": foodBanks,
    "Social Care": socialCare,
    "Extra Curricular": extraCurricular
};

let layerControl = L.control.layers(overlays).addTo(map);

// Global Variables
let left = 0
let bottom  = 0
let right = 0
let topper  = 0

// Fetch CSV data

function addActivitiesToMap () {
    fetch('./CroydonReport.csv')
      .then(response => response.text())
      .then(csvData => {
        const myData = csvData;
    
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
      
      const jsonData = csvToJson(csvData);
      console.log(jsonData)
      for(let i=0; i<jsonData.length; i++){
        if(jsonData[i]['Activity Post Code'].length > 5 && jsonData[i]['Activity Post Code'].length <= 8 && jsonData[i]['Activity Post Code'].length != null){
            fetch(`https://findthatpostcode.uk/postcodes/${jsonData[i]['Activity Post Code']}.json`).then((response) => {
                    return response.json();
            }).then(data => {
                // Add markers
                const lat = data.data.attributes.location.lat
                const lng = data.data.attributes.location.lon
                if(lat > bottom && lat < topper && lng > left && lng < right){
                    let marker = L.marker([lat, lng]).addTo(map);
                    // Fix error where url Link key is coming up undefined
                    const keyToFind = "Link ";
        
                    const linkKey = Object.keys(jsonData[i]).find(key =>
                    key.toLowerCase().trim() === keyToFind.toLowerCase().trim()
                    );
    
                    marker.bindPopup(
                        
                        `
                        <div class="marker-info">
                        <div class="marker-info-element"><h4>${jsonData[i]['Activity Name']}</h4></div>
                        <hr>
                        <div class="marker-info-element"><h4>Organisaton:</h4>${jsonData[i]['Service Provider Name']}</div>
                        <hr>
                        <div class="marker-info-element"><h4>Age Group:</h4> ${jsonData[i]["Age Group(s)"] == '' ? 'All Ages' : jsonData[i]["Age Group(s)"] }</div>
                        <hr>
                        <div class="marker-info-element"><h4>Category:</h4> ${jsonData[i]["Category(s)"]}</div>
                        <hr>
                        <div class="marker-info-element"><h4>Contact:</h4> ${ jsonData[i]["Contact Email"] == undefined ? jsonData[i]["Service Provider Email Address"] : jsonData[i]["Contact Email"]}</div>
                        <br>
                        <a href = ${jsonData[i][linkKey]} target='_blank'><button>Find Out More</button></a>
                        `)                      
                }
    
            })
        }
     }
      })
      .catch(error => {
        console.error('Error fetching CSV file:', error);
      })

}





// Convert user Postcode to long and lat using FindThatPostCode API
function findUserPostCode (postcode) {
    fetch(`https://findthatpostcode.uk/postcodes/${postcode}.json`).then((response) => {
        return response.json();
    }).then(data => {
        const lat = data.data.attributes.location.lat
        const lng = data.data.attributes.location.lon

        let currentLocation = L.icon({
            iconUrl: 'img/myLocation.png',
            iconSize:     [60, 60], 
            iconAnchor:   [30, 30], 
            popupAnchor:  [0, -10]
        });

        let marker = L.marker([lat, lng], {icon: currentLocation}).addTo(map);
        // L.circle([lat, lng], {
        //     color: 'blue',
        //     fillColor: 'blue',
        //     fillOpacity: 0.1,
        //     radius: 1600
        // }).addTo(map);
        marker.bindPopup('You are here').openPopup();
        map.setView([lat, lng], 14)
        
        // Add bounding box around Postcode
        left = lng - 0.028; 
        bottom = lat - 0.016; 
        right = lng + 0.028; 
        topper = lat + 0.016; 

        // L.marker([lat, left], {icon: currentLocation}).addTo(map);
        // L.marker([lat, right], {icon: currentLocation}).addTo(map);
        // L.marker([topper, lng], {icon: currentLocation}).addTo(map);
        // L.marker([bottom, lng], {icon: currentLocation}).addTo(map);

        let boundingBox = [[bottom, left], [topper, right]]
        console.log(lat, lng)
        console.log(boundingBox)
        map.fitBounds(boundingBox)

        addActivitiesToMap()

        // Check if markers fit within bounding box then make them visible
    })  
}






postcodeBtn.addEventListener("click", function(){findUserPostCode(document.querySelector('input').value)}) 








