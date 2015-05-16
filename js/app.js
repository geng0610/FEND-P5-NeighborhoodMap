
var locations = [];

//Create a model we will be using based on raw model

function checkNewLocations(current_locations, current_item_id){
    var new_item = true;
    for (var i in current_locations) {
        if(current_locations[i].id == current_item_id){
            new_item = false;
            break;
        }
    }
    return new_item;
};

for (var item in swarmExport.response.checkins.items) {
    var item_id = swarmExport.response.checkins.items[item].venue.id;
    if (checkNewLocations(locations, item_id)){
        var single_location = {};
        single_location.id=item_id;
        single_location.venueName=swarmExport.response.checkins.items[item].venue.name;
        single_location.venueUrl=swarmExport.response.checkins.items[item].venue.url;
        single_location.venueFormattedAddress=swarmExport.response.checkins.items[item].venue.location.formattedAddress;
        single_location.venueLat=swarmExport.response.checkins.items[item].venue.location.lat;
        single_location.venueLng=swarmExport.response.checkins.items[item].venue.location.lng;
        single_location.venueRating=0;
        single_location.venueCategory="tbd";
        /*$.getJSON('https://api.foursquare.com/v2/venues/53ff6394498eebee81f7b6f3?client_id=TU0ODIPVH3EANT0JA5KYHWH0HUNXQB5PGJ4JKUL3ZCTQZHC4&client_secret=KZHUSP0CU2QUB3LYTABAAZJGFP3GBHM05NV1ILF2E31ODKQX&v=20150513',
            {},function(data){
                console.log(data['response']['venue']['rating']);
                single_location.venueRating=data['response']['venue']['rating'];
            })*/
        locations.push(single_location);
    }
};

function getRatings(){
    for (var i in locations){
            $.ajax({
                'async':true,
                'global':false,
                'url':'https://api.foursquare.com/v2/venues/'+locations[i].id+'?client_id=TU0ODIPVH3EANT0JA5KYHWH0HUNXQB5PGJ4JKUL3ZCTQZHC4&client_secret=KZHUSP0CU2QUB3LYTABAAZJGFP3GBHM05NV1ILF2E31ODKQX&v=20150513',
                'dataType':"json",
                'success': function (data){
                    for (var j in locations) {
                        if (locations[j].id==data['response']['venue']['id']){
                            locations[j].venueRating=data['response']['venue']['rating'];
                            locations[j].venueCategory=data.response.venue.categories[0].name;
                        }
                    }
                }
            })

    }    
}

getRatings();

var mapView = {
    init: function(locations){
        var midpoint = {};
        var lat_min = locations[0].venueLat;
        var lat_max = locations[0].venueLat;
        var lng_min = locations[0].venueLng;
        var lng_max = locations[0].venueLng;
        for (var i in locations){
            if(locations[i].venueLat > lat_max)
                lat_max = locations[i].venueLat;
            else if(locations[i].venueLat < lat_min)
                lat_min = locations[i].venueLat;
            if(locations[i].venueLng > lng_max)
                lng_max = locations[i].venueLng;
            else if(locations[i].venueLng < lng_min)
                lng_min = locations[i].venueLng;
        }
        midpoint.lat = (lat_max+lat_min)/2;
        midpoint.lng = (lng_max+lng_min)/2;
        var GLOBE_WIDTH = 256
        var lng_angle = lng_max - lng_min ;
        if (lng_angle < 0) {
          lng_angle += 360;
        }   
        var lat_angle = lat_max - lat_min ;
        if (lat_angle < 0) {
          lat_angle += 360;
        }
        function calculateZoom(){
            return Math.min(Math.round(Math.log($('#map-canvas').innerWidth()*180 / lng_angle / GLOBE_WIDTH))+1, Math.round(Math.log($('#map-canvas').innerHeight()*180 / lat_angle / GLOBE_WIDTH))+1);
        }
        var zoomLevel = calculateZoom();
        var center=new google.maps.LatLng(midpoint.lat,midpoint.lng);
        var mapOptions = {
          center: center,
          zoom: zoomLevel
        };
        var map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);
        for (var i in locations){
            var myLat = locations[i].venueLat;
            var myLng = locations[i].venueLng;
            var myLatLng = new google.maps.LatLng(myLat,myLng);
            var marker = new google.maps.Marker({
                position: myLatLng,
                map:map
            });
        }
        google.maps.event.addDomListener(window, "resize", function() {
            var newCenter = map.getCenter();
            google.maps.event.trigger(map, "resize");
            map.setCenter(newCenter);
            map.setZoom(calculateZoom());
        });
    },

    initLocation: function(single_location){
        console.log("creating a location element")
        var locationContainer = document.createElement("div");
        locationContainer.id=single_location.id
        locationContainer.classList.add("location-profile");

        var locationName = document.createElement("h2");
        locationName.classList.add("location-name");
        locationName.innerHTML = single_location.venueName;
        locationContainer.appendChild(locationName);

        var locationCategory = document.createElement("h3");
        locationCategory.classList.add("location-category");
        locationCategory.innerHTML = single_location.venueCategory;
        locationContainer.appendChild(locationCategory);

        var locationRating = document.createElement("p");
        locationRating.classList.add("location-rating");
        locationRating.innerHTML = single_location.rating;
        locationContainer.appendChild(locationRating);

        var locationLink = document.createElement("a");
        locationLink.classList.add("location-link");
        locationLink.href = single_location.venueUrl;
        locationContainer.appendChild(locationLink);

        var locationLinkLogo = document.createElement("img");
        locationLinkLogo.classList.add("link-icon");
        locationLinkLogo.src = "images/link-icon.png";
        locationLink.appendChild(locationLinkLogo);

        var locationAddress = document.createElement("p");
        locationAddress.classList.add("location-address");
        locationAddress.innerHTML = single_location.venueFormattedAddress;
        locationContainer.appendChild(locationAddress);

        return locationContainer;
    },

    initSideBar: function (locations){
        var tempLocations = document.createDocumentFragment();
        for (var i in locations) {
            tempLocations.appendChild(mapView.initLocation(locations[i]));
        }
        document.querySelector("#side-bar-body").appendChild(tempLocations);
    }
}

google.maps.event.addDomListener(window, 'load', mapView.init(locations));
document.addEventListener('DOMContentLoaded', function() {
  mapView.initSideBar(locations);
});
//google.maps.event.addDomListener(window, 'load', getRatings());