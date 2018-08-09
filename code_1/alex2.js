let place, service, placeLoc, marker, userMarker, infowindow, map, infoWindow, pos, feature, pyrmont, myLocation = {}, markers = [];

let standart = {
  lat: 40.775812,
  lng: -73.971636
};

let icons = {
  user: 'icons/crab.png',
  liquor_store: 'icons/liquor.png',
  atm: 'icons/atm.png',
  bar: 'icons/bar.png'
};

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    // center: pyrmont,
    zoom: 15
  });

  infowindow = new google.maps.InfoWindow();
  service = new google.maps.places.PlacesService(map);

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(function(position) {
      pyrmont = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      Object.assign(myLocation, pyrmont);

      map.setCenter(pyrmont);
      setUserMarker(pyrmont);
    }, function() {
      pyrmont = {};
      Object.assign(pyrmont, standart);
      $('#myLocation').hide();
      map.setCenter(pyrmont);
      setUserMarker(pyrmont);
    });
  }

  map.addListener('click', function(event) {
    pyrmont.lat = event.latLng.lat();
    pyrmont.lng = event.latLng.lng();
    userMarker.setPosition(pyrmont);
    map.setCenter(pyrmont);
    // userMarker.setMap(map);
  });
};

function setUserMarker(pos) {
  if (userMarker != null) userMarker.setMap(null);
  userMarker = new google.maps.Marker({
    position: pos,
    icon: icons.user,
    map: map,
    title: 'Here I am'
  });
  map.panTo(userMarker.getPosition());
}

function callback(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    for (let i = 0; i < results.length; i++) {
      createMarker(results[i], feature);
    }
  }
}

function createMarker(place, feature) {
  placeLoc = place.geometry.location;
  marker = new google.maps.Marker({
    map: map,
    icon: icons[feature],
    position: placeLoc
  });

  markers.push(marker);

  google.maps.event.addListener(marker, 'click', function() {
    let status = '', rating = '';
    if(place.opening_hours === undefined) status = 'Nobody nows!';
    else if(place.opening_hours.open_now === true) status = 'Open!';
    else if(place.opening_hours.open_now === false) status = 'Closed!';
    if(place.rating >= 0) rating = place.rating;
    else rating = 'no info.';
    infowindow.setContent(`<div><p>${place.name}</p><p>${place.vicinity}</p><p>Rating: ${rating}</p><p>${status}</p></div>`);
    infowindow.open(map, this);
  });
}

function setMapOnAll(map) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

function clearMarkers() {
  setMapOnAll(null);
};

function showMarkers() {
  setMapOnAll(map);
};

function nearby (feature, loc) {
  service.nearbySearch({
    location: loc,
    radius: 1000,
    type: feature,
  }, callback);
};

$(document).on('click', '#bar, #atm, #liquor_store, #myLocation', function(){
  clearMarkers();
  feature = $(this).attr('id');
  if(feature != 'myLocation') nearby(feature, pyrmont);
  else {
    setUserMarker(myLocation);
    Object.assign(pyrmont, myLocation); //object behavior
  };
  map.panTo(userMarker.getPosition());
});
