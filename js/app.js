//////////////////////////////////////
//Model (refered to as locations)//
//////////////////////////////////////

var model = {
    previousSelectedLocation: null,
    selectedLocation: null,
    locations: [],
    //Create a model we will be using based on raw model
    init: function(){
        //helper function to help identify unique locations
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
        //use exported json to populate locations. not all fields are populated right away due to limitation in data.
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
    //helper function. provides basic access to elements within the model
    selectLocationById: function(singleLocationId){
        for (var i in model.locations){
            if (model.locations[i].id==singleLocationId){
                return model.locations[i];
                break;
            }
        }
    },
    //helper function. part of the initialization process. Use api to grab the latest pictures and other missing fields.
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
    //initialize the app
    init: function(locations){
        model.init();
        model.getRatings();
        mapView.initMap(model.locations)
        setTimeout(function(){ // wait for ajaxcall to populate the rest of the model
            mapView.initSideBar(model.locations);
        },500);
    },

    //Clicking on a location name, location address, or location marker will zoom the map to that location.
    setCurrentLocation: function(location_id){
        model.previousSelectedLocation = model.selectedLocation;
        if(model.previousSelectedLocation){
            mapView.unfocusOnMarker(model.previousSelectedLocation);
            mapView.closeInfoWindow();
        }
        model.selectedLocation = model.selectLocationById(location_id);
        mapView.zoomToLocation(model.selectedLocation);
        mapView.focusOnMarker(model.selectedLocation);
    },

    //Clicking on a location name or location marker will display the details of that location in a infoWindow on the map.
    expandCurrentLocation: function(location_id){
        model.previousSelectedLocation = model.selectedLocation;
        mapView.initInfoWindow(model.selectedLocation);        
    },

    //Search for locations using a query. Name, cateogry and formattedaddress are all searchable fields.
    searchByName:function(query){
        if (query.length>0){ //works only when query has content
            var filteredLocations = []; //create a list of search results
            for (var i in model.locations){
                if (model.locations[i].venueName.toLowerCase().search(query.toLowerCase())>=0||model.locations[i].venueFormattedAddress.toString().toLowerCase().search(query.toLowerCase())>=0||model.locations[i].venueCategory.toLowerCase().search(query.toLowerCase())>=0){
                    filteredLocations.push(model.locations[i]);
                }
            }
            modelViewController.reset(); //reset the MVC before populating the map with search results.
            mapView.showSelectLocations(filteredLocations);
        }
    },
    //reset the MVC to the initial state.
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
    map: new google.maps.Map(document.getElementById('map-canvas')), //create a new map
    markers:[], //list of displayed markers
    //helper function to set center and bounds of a map from a given list of locations
    setMapCenterAndBound: function(locations){
        //need midpoint and boundary to make the map look nice.
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
        var center=new google.maps.LatLng(midpoint.lat,midpoint.lng);
        mapView.map.setCenter(center);
        var bounds = new google.maps.LatLngBounds(); //create a new bounds
        var ne = new google.maps.LatLng(lat_max,lng_max); //coordinate of one corner
        var sw = new google.maps.LatLng(lat_min,lng_min); //coordinate of the opposite corner
        bounds.extend(ne);
        bounds.extend(sw);
        mapView.map.fitBounds(bounds);
    },
    //create a map from a list of locations
    initMap: function(locations){
        mapView.setMapCenterAndBound(locations); //fit the location of the map
        //create markers
        for (var i in locations){ 
            var myLat = locations[i].venueLat;
            var myLng = locations[i].venueLng;
            var myLatLng = new google.maps.LatLng(myLat,myLng);
            var marker = new google.maps.Marker({
                position: myLatLng,
                map:mapView.map,
                id:locations[i].id
            });
            //on click, go to the current location and show more details.
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
    // create a side bar
    initSideBar: function (locations){
        var tempLocations = document.createDocumentFragment();
        tempLocations.id = "tempLocation";
        for (var i in locations) {
            tempLocations.appendChild(mapView.initLocation(locations[i], i));
        }
        $("#loading-wheel").hide() //get ride of the loading wheel
        document.querySelector("#side-bar-body").appendChild(tempLocations);
    },
    // create a location div that goes inside the side bar. Counter is used to make the div look better.
    initLocation: function(singleLocation, counter){
        //create a container
        var locationContainer = document.createElement("div");
        locationContainer.id=singleLocation.id
        locationContainer.classList.add("location-profile");
        //make the container look more Google-esque
        var styleCounter = counter%4
        if( styleCounter == 0 ){
            locationContainer.style.borderBottom = "3px solid #3F51B5";
        } else if( styleCounter == 1 ){
            locationContainer.style.borderBottom = "3px solid #F44336";
        } else if( styleCounter == 2 ){
            locationContainer.style.borderBottom = "3px solid #FFC107";
        } else{
            locationContainer.style.borderBottom = "3px solid green";
        }

        //add name element. on click, go to the current location and show more details.
        var locationName = document.createElement("h2");
        locationName.classList.add("location-name");
        locationName.innerHTML = singleLocation.venueName;
        locationName.addEventListener("click",function(){
            modelViewController.setCurrentLocation(singleLocation.id);
            modelViewController.expandCurrentLocation(singleLocation.id);
        });
        locationContainer.appendChild(locationName);

        //add category
        var locationCategory = document.createElement("h3");
        locationCategory.classList.add("location-category");
        locationCategory.innerHTML = singleLocation.venueCategory;
        locationContainer.appendChild(locationCategory);

        //add location and rating
        var locationRatingAndLink = document.createElement("div");
        locationRatingAndLink.classList.add("location-rating-and-link");
        locationContainer.appendChild(locationRatingAndLink);

        var locationRating = document.createElement("span");
        locationRating.classList.add("location-rating");
        //change color based on the rating of the venue
        if (singleLocation.venueRating){
            locationRating.innerHTML = singleLocation.venueRating+"/10";
            if(singleLocation.venueRating>8){
                locationRating.style.color = "green";
            } else if (singleLocation.venueRating>7) {
                locationRating.style.color = "#FFC107";
            } else{
                locationRating.style.color = "red";
            }
        } else (
            locationRating.innerHTML = "Not yet rated."
        )
        locationRatingAndLink.appendChild(locationRating);

        //add link to a link logo
        var locationLink = document.createElement("a");
        locationLink.classList.add("location-link");
        locationLink.href = singleLocation.venueUrl;
        locationRatingAndLink.appendChild(locationLink);

        var locationLinkLogo = document.createElement("img");
        locationLinkLogo.classList.add("link-icon");
        locationLinkLogo.src = "images/link-icon.png";
        locationLink.appendChild(locationLinkLogo);

        //add address
        var locationAddress = document.createElement("p");
        locationAddress.classList.add("location-address");
        var tempAddressText = "";
        for (var i in singleLocation.venueFormattedAddress) {
            if (i<singleLocation.venueFormattedAddress.length-1){ //no break on the last element
                tempAddressText = tempAddressText+singleLocation.venueFormattedAddress[i]+"<BR>";
            } else {
                tempAddressText = tempAddressText+singleLocation.venueFormattedAddress[i];
            }
        }
        locationAddress.innerHTML = tempAddressText;
        ///on click, go to the current location.
        locationAddress.addEventListener("click",function(){modelViewController.setCurrentLocation(singleLocation.id);});//modelViewController.setCurrentLocation(singleLocation.id));
        locationContainer.appendChild(locationAddress);

        return locationContainer;
    },

    //create a new infoWindow template
    infowindow : new google.maps.InfoWindow(),
    initInfoWindow: function (singleLocation){

        //create a infowindow container
        var infoWindowContainer = document.createElement("div");
        infoWindowContainer.id = "container-"+singleLocation.id;
        infoWindowContainer.classList.add("info-container");

        //create a name element
        var locationName = document.createElement("h2");
        locationName.classList.add("info-location-name");
        locationName.innerHTML = singleLocation.venueName;
        infoWindowContainer.appendChild(locationName);

        //create a category element
        var locationCategory = document.createElement("h3");
        locationCategory.classList.add("location-category");
        locationCategory.innerHTML = singleLocation.venueCategory;
        infoWindowContainer.appendChild(locationCategory);

        //add rating and link
        var locationRatingAndLink = document.createElement("div");
        locationRatingAndLink.classList.add("location-rating-and-link");
        infoWindowContainer.appendChild(locationRatingAndLink);

        //change the color of rating based on the value
        var locationRating = document.createElement("span");
        locationRating.classList.add("location-rating");
        if (singleLocation.venueRating){
            locationRating.innerHTML = singleLocation.venueRating+"/10";
            if(singleLocation.venueRating>8){
                locationRating.style.color = "green";
            } else if (singleLocation.venueRating>7) {
                locationRating.style.color = "#FFC107";
            } else{
                locationRating.style.color = "red";
            }
        } else (
            locationRating.innerHTML = "Not yet rated."
        )

        locationRatingAndLink.appendChild(locationRating);

        //add link to the link logo
        var locationLink = document.createElement("a");
        locationLink.classList.add("location-link");
        locationLink.href = singleLocation.venueUrl;
        locationRatingAndLink.appendChild(locationLink);

        var locationLinkLogo = document.createElement("img");
        locationLinkLogo.classList.add("link-icon");
        locationLinkLogo.src = "images/link-icon.png";
        locationLink.appendChild(locationLinkLogo);

        //add address
        var locationAddress = document.createElement("p");
        locationAddress.classList.add("info-location-address");
        var tempAddressText = "";
        for (var i in singleLocation.venueFormattedAddress) {
            if (i<singleLocation.venueFormattedAddress.length-1){
                tempAddressText = tempAddressText+singleLocation.venueFormattedAddress[i]+"<BR>";
            } else {
                tempAddressText = tempAddressText+singleLocation.venueFormattedAddress[i];
            }
        }
        locationAddress.innerHTML = tempAddressText;
        infoWindowContainer.appendChild(locationAddress);

        //add pictures. sourced from outside
        var locationPictures = document.createElement("div");
        locationPictures.classList.add("location-pictures");
        infoWindowContainer.appendChild(locationPictures);

        for (var i in singleLocation.venuePhotos){
            var locationPicture = document.createElement("img");
            locationPicture.classList.add("location-picture");
            locationPicture.src = singleLocation.venuePhotos[i].prefix+"200x200"+singleLocation.venuePhotos[i].suffix;
            locationPictures.appendChild(locationPicture);
        }


        mapView.infowindow.setContent(infoWindowContainer);

        //find the relevant marker and open based on that.
        var marker;
        for (var i in mapView.markers){
            if (mapView.markers[i].id == singleLocation.id){
                marker = mapView.markers[i];
            }
        }
        mapView.infowindow.open(marker.getMap(), marker);
    },

    //helper function. close a info window
    closeInfoWindow : function(){
        mapView.infowindow.close();
    },

    //helper function. zoom to a location.
    zoomToLocation: function(singleLocation){
        var newLat = singleLocation.venueLat;
        var newLng = singleLocation.venueLng;
        var newCenter = new google.maps.LatLng(newLat, newLng);
        mapView.map.setCenter(newCenter);
        mapView.map.setZoom(14);
    },

    //helpfer function. turns a location marker to blue
    focusOnMarker: function(singleLocation){
        var tempId = singleLocation.id;
        for (var i in mapView.markers){
            if (mapView.markers[i].id==tempId){
                map:mapView.markers[i].setIcon("http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-blue.png")
                break;
            }
        }
    },

    //helper function. turns a location marker to default.
    unfocusOnMarker: function(singleLocation){
        var tempId = singleLocation.id;
        for (var i in mapView.markers){
            if (mapView.markers[i].id==tempId){
                map:mapView.markers[i].setIcon("")
                break;
            }
        }
    },

    //helper function. clean up the side bar and markers
    cleanMap: function(){
        for (i in mapView.markers){
            mapView.markers[i].setMap(null);
        }
        $("#side-bar-body > div").hide();
    },

    //show selected locations by unhinding relevant divs and markers
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

//initialize the app. attach search and reset functions to relevant input.
document.addEventListener('DOMContentLoaded', function() {
  modelViewController.init();
  $('#name-search').submit(function(event){
    modelViewController.searchByName($('#name-search input').val());
    event.preventDefault();
    });
  $('#reset-button').click(function(){modelViewController.reset()})//$('#name-search').submit(function(event){modelViewController.searchByName($('#name-search input').val()); event.preventDefault();});
});