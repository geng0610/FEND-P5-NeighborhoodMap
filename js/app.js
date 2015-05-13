/* ======= Model ======= */

var locations = [];

//Create a model we will be using based on raw model

for (var item in swarmExport.response.checkins.items) {
    var item_id = swarmExport.response.checkins.items[item].venue.id;
    if (checkNewLocations(locations, item_id)){
        var single_location = {};
        single_location.id=item_id;
        single_location.venueName=swarmExport.response.checkins.items[item].venue.name;
        single_location.venueFormattedAddress=swarmExport.response.checkins.items[item].venue.location.address+", "+swarmExport.response.checkins.items[item].venue.location.city+", "+swarmExport.response.checkins.items[item].venue.location.state+" "+swarmExport.response.checkins.items[item].venue.location.postalCode;
        single_location.venueLat=swarmExport.response.checkins.items[item].venue.location.lat;;
        single_location.venueLng=swarmExport.response.checkins.items[item].venue.location.lng;;
        locations.push(single_location);
    }
};

//Make sure duplicate locations are not included.

function checkNewLocations(current_locations, current_item_id){
    var new_item = true;
    for (var i in current_locations) {
        if(current_locations[i].item_id == current_item_id){
            console.log(current_locations[i].item_id+ "duplicate name" + current_item_id);
            new_item = false;
            break;
        }
    }
    return new_item;
}

var midpoint = {};
var lat_min = locations[0].venueLat;
var lat_max = locations[0].venueLat;
var lng_min = locations[0].venueLng;
var lng_max = locations[0].venueLng;
console.log(lat_min,lat_max,lng_min,lng_max)

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

//console.log(lat_sum);
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
    return Math.min(Math.round(Math.log($('#map-canvas').innerWidth()*360 / lng_angle / GLOBE_WIDTH))+1, Math.round(Math.log($('#map-canvas').innerHeight()*360 / lat_angle / GLOBE_WIDTH))+1);
}

var zoomLevel = calculateZoom();

//console.log(locations);

var mapView = {
    init: function(locations, midpoint){
        var center=new google.maps.LatLng(midpoint.lat,midpoint.lng);
        var mapOptions = {
          center: center,
          zoom: zoomLevel
        };
        var map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);
        //console.log(locations);
        for (var i in locations){
            var myLat = locations[i].venueLat;
            var myLng = locations[i].venueLng;
            var myLatLng = new google.maps.LatLng(myLat,myLng);
            var myFormattedAddress = locations[i].venueFormattedAddress;
            var request = {
                location: myLatLng,
                radius: '500',
                query: myFormattedAddress
            };
            var service = new google.maps.places.PlacesService(map);
            service.textSearch(request, callback);
            function callback(results, status) {
              if (status == google.maps.places.PlacesServiceStatus.OK) {
                //for (var i = 0; i < results.length; i++) {
                    var place = results[0];
                    console.log(place);
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(40.7127,-74.0059),
                        map: map 
                    });
                //}
              }
            }

            //console.log(myLatLng);
            /*var marker = new google.maps.Marker({
                position: myLatLng,
                map: map
            });*/
        }

        /*var request = {
            location: new google.maps.LatLng(40.7127,-74.0059),
            radius: '500',
            query: "Eugene O'Neill Theatre 230 W 49th St (btwn Broadway & 8th Ave) New York, NY 10019"
        };
        service = new google.maps.places.PlacesService(map);
        service.textSearch(request, callback)
        function callback(results, status) {
              if (status == google.maps.places.PlacesServiceStatus.OK) {
                for (var i = 0; i < results.length; i++) {
                    var place = results[i];
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(40.7127,-74.0059),
                        map: map 
                    });
                }
              }
            }*/
        google.maps.event.addDomListener(window, "resize", function() {
            var newCenter = map.getCenter();
            google.maps.event.trigger(map, "resize");
            map.setCenter(newCenter);
            map.setZoom(calculateZoom());
        });
    }
}

google.maps.event.addDomListener(window, 'load', mapView.init(locations, midpoint));

