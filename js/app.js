//////////////////////////////////////
//Model (refered to as locations)//
//////////////////////////////////////

var model = {
    previousSelectedLocation: null,
    selectedLocation: null,
    locations: [],
    init: function(){

        //Create a model we will be using based on raw model

        function checkNewLocations(currentLocations, currentItemId){
            var new_item = true;
            for (var i in currentLocations) {
                if(currentLocations[i].id == currentItemId){
                    new_item = false;
                    break;
                }
            }
            return new_item;
        };

        for (var item in swarmExport.response.checkins.items) {
            var item_id = swarmExport.response.checkins.items[item].venue.id;
            if (checkNewLocations(model.locations, item_id)){
                var singleLocation = {};
                singleLocation.id=item_id;
                singleLocation.venueName=swarmExport.response.checkins.items[item].venue.name;
                singleLocation.venueUrl=swarmExport.response.checkins.items[item].venue.url;
                singleLocation.venueFormattedAddress=swarmExport.response.checkins.items[item].venue.location.formattedAddress;
                singleLocation.venueLat=swarmExport.response.checkins.items[item].venue.location.lat;
                singleLocation.venueLng=swarmExport.response.checkins.items[item].venue.location.lng;
                singleLocation.venueRating="Not yet rated.";
                singleLocation.venueCategory="A category of its own";
                /*$.getJSON('https://api.foursquare.com/v2/venues/53ff6394498eebee81f7b6f3?client_id=TU0ODIPVH3EANT0JA5KYHWH0HUNXQB5PGJ4JKUL3ZCTQZHC4&client_secret=KZHUSP0CU2QUB3LYTABAAZJGFP3GBHM05NV1ILF2E31ODKQX&v=20150513',
                    {},function(data){
                        console.log(data['response']['venue']['rating']);
                        singleLocation.venueRating=data['response']['venue']['rating'];
                    })*/
                model.locations.push(singleLocation);
            }
        };
    },
    selectLocationById: function(singleLocationId){
        for (var i in model.locations){
            if (model.locations[i].id==singleLocationId){
                return model.locations[i];
                break;
            }
        }
    },
    getRatings: function(){
        for (var i in model.locations){
            $.ajax({
                'async':true,
                'global':false,
                'url':'https://api.foursquare.com/v2/venues/'+model.locations[i].id+'?client_id=TU0ODIPVH3EANT0JA5KYHWH0HUNXQB5PGJ4JKUL3ZCTQZHC4&client_secret=KZHUSP0CU2QUB3LYTABAAZJGFP3GBHM05NV1ILF2E31ODKQX&v=20150513',
                'dataType':"json",
                'success': function (data){
                    for (var j in model.locations) {
                        if (model.locations[j].id==data['response']['venue']['id']){
                            model.locations[j].venueRating=data['response']['venue']['rating'];
                            model.locations[j].venueCategory=data.response.venue.categories[0].name;
                            model.locations[j].venuePhotos=data.response.venue.photos.groups.items;
                            //console.log(model.locations[j].venuePhotos);
                            if(model.locations[j].venueRating){
                                $('#'+model.locations[j].id).children(".location-rating-and-link").children(".location-rating").text(model.locations[j].venueRating+"/10");
                                if(model.locations[j].venueRating > 8){
                                    $('#'+model.locations[j].id).children(".location-rating-and-link").children(".location-rating").css({"color":"green"});
                                } else if(model.locations[j].venueRating > 7){
                                    $('#'+model.locations[j].id).children(".location-rating-and-link").children(".location-rating").css({"color":"#FFC107"});
                                } else {
                                    $('#'+model.locations[j].id).children(".location-rating-and-link").children(".location-rating").css({"color":"red"});
                                }
                            }
                            $('#'+model.locations[j].id).children(".location-category").text(model.locations[j].venueCategory);
                        }
                    }
                }
            })
        }
    }
}





//////////////////////////////////////
//Model View Controller//
//////////////////////////////////////

var modelViewController={
    init: function(locations){
        model.init();
        mapView.init(model.locations);
        mapView.initSideBar(model.locations);
        model.getRatings();
    },
    setCurrentLocation: function(location_id){
        model.previousSelectedLocation = model.selectedLocation;
        if(model.previousSelectedLocation){
            model.selectedLocation = model.selectLocationById(location_id);
            mapView.zoomToLocation(model.selectedLocation);
            mapView.unfocusOnMarker(model.previousSelectedLocation);
            mapView.focusOnMarker(model.selectedLocation);
            console.log(model.previousSelectedLocation, model.selectedLocation);
        } else{
            model.selectedLocation=model.selectLocationById(location_id)
            mapView.zoomToLocation(model.selectedLocation);
            mapView.focusOnMarker(model.selectedLocation);
        }
    },
    searchByName:function(query){
        console.log("search by name called", query)
        if (query.length>0){
            var filteredLocations = [];
            for (var i in model.locations){
                if (model.locations[i].venueName.toLowerCase().search(query.toLowerCase())>=0||model.locations[i].venueFormattedAddress.toString().toLowerCase().search(query.toLowerCase())>=0||model.locations[i].venueCategory.toLowerCase().search(query.toLowerCase())>=0){
                    filteredLocations.push(model.locations[i]);
                }
            }
            console.log(filteredLocations);
            mapView.showSelectLocations(filteredLocations);
        }
    },
    reset: function(){
        mapView.showSelectLocations(model.locations);
    }
}


//////////////////////////////////////
//View//
//////////////////////////////////////
var mapView = {
    map: new google.maps.Map(document.getElementById('map-canvas')),
    markers:[],
    setMapCenterAndZoom: function(locations){
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
        //var map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);
        mapView.map.setOptions(mapOptions);
    },
    init: function(locations){
        mapView.setMapCenterAndZoom(locations);
        for (var i in locations){
            var myLat = locations[i].venueLat;
            var myLng = locations[i].venueLng;
            var myLatLng = new google.maps.LatLng(myLat,myLng);
            var marker = new google.maps.Marker({
                position: myLatLng,
                map:mapView.map,
                id:locations[i].id
            });
            mapView.markers.push(marker);
        }
        google.maps.event.addDomListener(window, "resize", function() {
            var newCenter = mapView.map.getCenter();
            google.maps.event.trigger(mapView.map, "resize");
            mapView.map.setCenter(newCenter);
            //mapView.map.setZoom(calculateZoom());
        });
    },
    initLocation: function(single_location){
        //console.log("creating a location element")
        var locationContainer = document.createElement("div");
        locationContainer.id=single_location.id
        locationContainer.classList.add("location-profile");

        var locationName = document.createElement("h2");
        locationName.classList.add("location-name");
        locationName.innerHTML = single_location.venueName;
        locationName.addEventListener("click",function(){modelViewController.setCurrentLocation(single_location.id);});//modelViewController.setCurrentLocation(single_location.id));
        locationContainer.appendChild(locationName);

        var locationCategory = document.createElement("h3");
        locationCategory.classList.add("location-category");
        locationCategory.innerHTML = single_location.venueCategory;
        locationContainer.appendChild(locationCategory);

        var locationRatingAndLink = document.createElement("div");
        locationRatingAndLink.classList.add("location-rating-and-link");
        locationContainer.appendChild(locationRatingAndLink);

        var locationRating = document.createElement("span");
        locationRating.classList.add("location-rating");
        locationRating.innerHTML = single_location.venueRating;
        locationRatingAndLink.appendChild(locationRating);

        var locationLink = document.createElement("a");
        locationLink.classList.add("location-link");
        locationLink.href = single_location.venueUrl;
        locationRatingAndLink.appendChild(locationLink);

        var locationLinkLogo = document.createElement("img");
        locationLinkLogo.classList.add("link-icon");
        locationLinkLogo.src = "images/link-icon.png";
        locationLink.appendChild(locationLinkLogo);

        var locationAddress = document.createElement("p");
        locationAddress.classList.add("location-address");
        var tempAddressText = "";
        for (var i in single_location.venueFormattedAddress) {
            if (i<single_location.venueFormattedAddress.length-1){
                tempAddressText = tempAddressText+single_location.venueFormattedAddress[i]+"<BR>";
            } else {
                tempAddressText = tempAddressText+single_location.venueFormattedAddress[i];
            }
        }
        locationAddress.innerHTML = tempAddressText;
        locationAddress.addEventListener("click",function(){modelViewController.setCurrentLocation(single_location.id);});//modelViewController.setCurrentLocation(single_location.id));
        locationContainer.appendChild(locationAddress);

        return locationContainer;
    },

    initSideBar: function (locations){
        var tempLocations = document.createDocumentFragment();
        for (var i in locations) {
            tempLocations.appendChild(mapView.initLocation(locations[i]));
        }
        document.querySelector("#side-bar-body").appendChild(tempLocations);
    },

    zoomToLocation: function(single_location){
        var newLat = single_location.venueLat;
        var newLng = single_location.venueLng;
        var newCenter = new google.maps.LatLng(newLat, newLng);
        mapView.map.setCenter(newCenter);
        mapView.map.setZoom(15);
    },

    focusOnMarker: function(singleLocation){
        var tempId = singleLocation.id;
        for (var i in mapView.markers){
            if (mapView.markers[i].id==tempId){
                map:mapView.markers[i].setIcon("http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-blue.png")
                break;
            }
        }
    },

    unfocusOnMarker: function(singleLocation){
        var tempId = singleLocation.id;
        for (var i in mapView.markers){
            if (mapView.markers[i].id==tempId){
                map:mapView.markers[i].setIcon("")
                break;
            }
        }
    },

    cleanMap: function(){
        for (i in mapView.markers){
            mapView.markers[i].setMap(null);
            $("#side-bar-body > div").hide();
        }
    },

    showSelectLocations: function(selectedLocations){
        mapView.cleanMap();
        mapView.setMapCenterAndZoom(selectedLocations);
        for (var i in selectedLocations){
            $("#"+selectedLocations[i].id).show();
            for (var j in mapView.markers){
                if (selectedLocations[i].id==mapView.markers[j].id){
                    mapView.markers[j].setMap(mapView.map);
                    break;
                }
            }
        }
    }
}

//google.maps.event.addDomListener(window, 'load', mapView.init(locations));
document.addEventListener('DOMContentLoaded', function() {
  modelViewController.init();
  $('#name-search').submit(function(event){
    modelViewController.searchByName($('#name-search input').val());
    event.preventDefault();
    });
  $('#reset-button').click(function(){modelViewController.reset()})//$('#name-search').submit(function(event){modelViewController.searchByName($('#name-search input').val()); event.preventDefault();});
});
//google.maps.event.addDomListener(window, 'load', getRatings());