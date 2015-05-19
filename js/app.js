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
                singleLocation.venuePhotos="";
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
                            model.locations[j].venuePhotos=data.response.venue.photos.groups[0].items;
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
        mapView.initSideBar(model.locations);
        model.getRatings();
        mapView.init(model.locations);
    },
    setCurrentLocation: function(location_id){
        model.previousSelectedLocation = model.selectedLocation;
        if(model.previousSelectedLocation){
            mapView.unfocusOnMarker(model.previousSelectedLocation);
            mapView.closeInfoWindow();
        }
        model.selectedLocation = model.selectLocationById(location_id);
        mapView.zoomToLocation(model.selectedLocation);
        mapView.focusOnMarker(model.selectedLocation);
            //console.log(model.previousSelectedLocation, model.selectedLocation);
    },
    expandCurrentLocation: function(location_id){
        model.previousSelectedLocation = model.selectedLocation;
        mapView.initInfoWindow(model.selectedLocation);        
    },
    searchByName:function(query){
        //console.log("search by name called", query)
        if (query.length>0){
            modelViewController.reset();
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
        if (model.selectedLocation){
            mapView.unfocusOnMarker(model.selectedLocation);
        }
        mapView.closeInfoWindow();
        model.selectedLocation = null;
        model.previousSelectedLocation = null;
    }
}


//////////////////////////////////////
//View//
//////////////////////////////////////
var mapView = {
    map: new google.maps.Map(document.getElementById('map-canvas')),
    markers:[],
    setMapCenterAndBound: function(locations){
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
        var ne = new google.maps.LatLng(lat_max,lng_max);
        var sw = new google.maps.LatLng(lat_min,lng_min);
        var center=new google.maps.LatLng(midpoint.lat,midpoint.lng);
        mapView.map.setCenter(center);
        var bounds = new google.maps.LatLngBounds();
        bounds.extend(ne);
        bounds.extend(sw);
        mapView.map.fitBounds(bounds);
    },
    init: function(locations){
        mapView.setMapCenterAndBound(locations);
        for (var i in locations){
            var myLat = locations[i].venueLat;
            var myLng = locations[i].venueLng;
            var myLatLng = new google.maps.LatLng(myLat,myLng);
            var marker = new google.maps.Marker({
                position: myLatLng,
                map:mapView.map,
                id:locations[i].id
            });
            google.maps.event.addListener(marker, 'click', function(){
                modelViewController.setCurrentLocation(this.id);
                modelViewController.expandCurrentLocation(this.id);
            })
            mapView.markers.push(marker);
        }
        google.maps.event.addDomListener(window, "resize", function() {
            var newCenter = mapView.map.getCenter();
            google.maps.event.trigger(mapView.map, "resize");
            mapView.map.setCenter(newCenter);
            //mapView.map.setZoom(calculateZoom());
        });
    },
    infowindow : new google.maps.InfoWindow(), 
    initInfoWindow: function (single_location){

        var infoWindowContainer = document.createElement("div");
        infoWindowContainer.id = "container-"+single_location.id;
        infoWindowContainer.classList.add("info-container");

        var locationName = document.createElement("h2");
        locationName.classList.add("info-location-name");
        locationName.innerHTML = single_location.venueName;
        infoWindowContainer.appendChild(locationName);

        var locationCategory = document.createElement("h3");
        locationCategory.classList.add("location-category");
        locationCategory.innerHTML = single_location.venueCategory;
        infoWindowContainer.appendChild(locationCategory);

        var locationRatingAndLink = document.createElement("div");
        locationRatingAndLink.classList.add("location-rating-and-link");
        infoWindowContainer.appendChild(locationRatingAndLink);

        var locationRating = document.createElement("span");
        locationRating.classList.add("location-rating");
        if (single_location.venueRating){
            locationRating.innerHTML = single_location.venueRating+"/10";
            if(single_location.venueRating>8){
                locationRating.style.color = "green";
            } if (single_location.venueRating>7) {
                locationRating.style.color = "#FFC107";
            } else{
                locationRating.style.color = "red";
            }
        } else (
            locationRating.innerHTML = "Not yet rated."
        )

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
        locationAddress.classList.add("info-location-address");
        var tempAddressText = "";
        for (var i in single_location.venueFormattedAddress) {
            if (i<single_location.venueFormattedAddress.length-1){
                tempAddressText = tempAddressText+single_location.venueFormattedAddress[i]+"<BR>";
            } else {
                tempAddressText = tempAddressText+single_location.venueFormattedAddress[i];
            }
        }
        locationAddress.innerHTML = tempAddressText;
        infoWindowContainer.appendChild(locationAddress);

        var locationPictures = document.createElement("div");
        locationPictures.classList.add("location-pictures");
        infoWindowContainer.appendChild(locationPictures);

        for (var i in single_location.venuePhotos){
            var locationPicture = document.createElement("img");
            locationPicture.classList.add("location-picture");
            locationPicture.src = single_location.venuePhotos[i].prefix+"200x200"+single_location.venuePhotos[i].suffix;
            locationPictures.appendChild(locationPicture);
        }


        mapView.infowindow.setContent(infoWindowContainer);
        //infowindow.setContent(single_location.id);
        var marker;
        for (var i in mapView.markers){
            if (mapView.markers[i].id == single_location.id){
                marker = mapView.markers[i];
            }
        }
        mapView.infowindow.open(marker.getMap(), marker);
    },
    closeInfoWindow : function(){
        mapView.infowindow.close();
    },
    initLocation: function(single_location, counter){
        //console.log("creating a location element")
        var locationContainer = document.createElement("div");
        locationContainer.id=single_location.id
        locationContainer.classList.add("location-profile");
        var styleCounter = counter%4
        if( styleCounter == 0 ){
            locationContainer.style.borderBottom = "3px solid #3F51B5";
        } if( styleCounter == 1 ){
            locationContainer.style.borderBottom = "3px solid #F44336";
        } if( styleCounter == 2 ){
            locationContainer.style.borderBottom = "3px solid #FFC107";
        } if( styleCounter == 3 ){
            locationContainer.style.borderBottom = "3px solid green";
        }

        var locationNameButton = document.createElement("button");
        var locationName = document.createElement("h2");
        locationName.classList.add("location-name");
        locationName.innerHTML = single_location.venueName;
        locationName.addEventListener("click",function(){modelViewController.setCurrentLocation(single_location.id);modelViewController.expandCurrentLocation(single_location.id);});//modelViewController.setCurrentLocation(single_location.id));
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
        tempLocations.id = "tempLocation";
        for (var i in locations) {
            tempLocations.appendChild(mapView.initLocation(locations[i], i));
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
        mapView.setMapCenterAndBound(selectedLocations);
        for (var i in selectedLocations){
            $("#"+selectedLocations[i].id).show();
            for (var j in mapView.markers){
                if (selectedLocations[i].id==mapView.markers[j].id){
                    mapView.markers[j].setMap(mapView.map);
                    break;
                }
            }
        }
    },
}

document.addEventListener('DOMContentLoaded', function() {
  modelViewController.init();
  $('#name-search').submit(function(event){
    modelViewController.searchByName($('#name-search input').val());
    event.preventDefault();
    });
  $('#reset-button').click(function(){modelViewController.reset()})//$('#name-search').submit(function(event){modelViewController.searchByName($('#name-search input').val()); event.preventDefault();});
});