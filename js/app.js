// helper function to make Google map responsive
function getMediaState(){
    return window.matchMedia( "screen and (max-device-width: 667px) and (orientation: portrait)" ).matches;
}

// model for each venue.
function venue(rawVenue){
    'use strict';
    var self = this;
    self.id = ko.observable(rawVenue.id);
    self.name = ko.observable(rawVenue.name);
    self.url = ko.observable(rawVenue.url);
    self.formattedAddress = ko.observableArray(rawVenue.location.formattedAddress);
    self.formattedAddressText = ko.computed(function(){
        return self.formattedAddress().join("<BR>");
    });
    self.lat = ko.observable(rawVenue.location.lat);
    self.lng = ko.observable(rawVenue.location.lng);
    self.rating = ko.observable(0);
    self.formattedRatingText = ko.computed(function(){
        var ratingText = ko.observable("Not yet rated.");
        if (self.rating()>0){
            ratingText(self.rating()+"/10");
        }
        return ratingText();
    });
    //used for text color for rating
    self.ratingColor = ko.computed(function(){
        var color = ko.observable("#E0E0E0");
        if (self.rating()>8){
            color("#00933B");
        } else if (self.rating()>7){
            color("#FFC107");
        } else if (self.rating()>0){
            color("#f44336");
        }
        return color();
    });
    self.category = ko.observable("Not yet categorized.");
    self.photos = ko.observableArray([]);
    self.marker = ko.computed(function(){
        var image = {
            url: "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-poi.png",
            size: null,
            origin: null,
            anchor: null,
            scaledSize: null,
        }
        //if on mobile scree, then use a larger marker
        if(getMediaState()){
            image.scaledSize = new google.maps.Size(88, 160);
        }
        return new google.maps.Marker({
            icon: image,
            position: new google.maps.LatLng(self.lat(), self.lng()),
            id: self.id()
        });
    });
}

//ViewModel
function ViewModel() {
    'use strict';
    var self = this;
    self.venues = ko.observableArray([]);
    //helper function to help remove duplicate venues from swarm export
    var checkNewVenue = function (venueId){
        var newVenue = true;
        for(var i =0; i<self.venues().length; i++){
            if (self.venues()[i].id()==venueId){
                newVenue = false;
                break;
            }
        }
        return newVenue;
    };
    //converting swarm export JSON to venues.
    for (var i = 0; i< swarmExport.response.checkins.items.length; i++){
        var itemId = swarmExport.response.checkins.items[i].venue.id;
        if (checkNewVenue(itemId)){
            self.venues.push(new venue(swarmExport.response.checkins.items[i].venue));
        }
    }
    //get the latest info on venues using ajax
    for (var i = 0; i<self.venues().length; i++){
        $.ajax({
            'async':true,
            'global':false,
            'url':'https://api.foursquare.com/v2/venues/'+self.venues()[i].id()+'?client_id=TU0ODIPVH3EANT0JA5KYHWH0HUNXQB5PGJ4JKUL3ZCTQZHC4&client_secret=KZHUSP0CU2QUB3LYTABAAZJGFP3GBHM05NV1ILF2E31ODKQX&v=20150520',
            'dataType':"json",
            'success': function (data){
                for (var j =0; j<self.venues().length; j++) {
                    if (self.venues()[j].id()==data.response.venue.id){
                        if(data.response.venue.rating>0){self.venues()[j].rating(data.response.venue.rating);}
                        if(data.response.venue.categories[0].name.length>0){self.venues()[j].category(data.response.venue.categories[0].name);}
                        if(data.response.venue.photos.groups[0].items.length>0){self.venues()[j].photos(data.response.venue.photos.groups[0].items);}
                    }
                }
            }
        });
    }
    //bind text of query input to a variable
    self.queryInput = ko.observable();
    //this is the variable we will be using to filter the model
    self.query = ko.observable();
    //this is list of venues we will be using to display info. This way, we don't need to change the entire list of venues.
    self.filteredVenues = ko.computed(function(){
        if(!self.query()){
            //initially, it's the same as the entire list of venues.
            return self.venues();
        } else {
            return ko.utils.arrayFilter(self.venues(), function(venue){
                return venue.name().toLowerCase().search(self.query().toLowerCase())>=0||venue.formattedAddress().toString().toLowerCase().search(self.query().toLowerCase())>=0||venue.category().toLowerCase().search(self.query().toLowerCase())>=0;
            });
        }
    });

    //when input is submit, we run a query.
    self.submitInput = function(){
        self.query(self.queryInput());
        cleanMap();
        drawMap();
    };

    self.reset = function(){
        self.query(null);
        self.queryInput(null);
        cleanMap();
        drawMap();
    };

    //google map object used in the app
    var map = new google.maps.Map(document.getElementById('map-canvas'));


    window.addEventListener("resize", function() {
        //when viewing this app on a small screen and resizing(changing orientation), forcing a reload creates better google map
        if(getMediaState()){
            location.reload()
        }
        var newCenter = map.getCenter();
        google.maps.event.trigger(map, "resize");
        map.setCenter(newCenter);

        //opted out changing marker size dynamically on risize due to issues with changing marker size without re-rendering the whole map.
        /*if(getMediaState){
            for (var i=0; i< self.venues().length; i++){
                var marker = self.venues()[i].marker();
                var image = marker.getIcon();
                image.scaledSize = new google.maps.Size(88, 160);
                marker.setIcon(image);
            }
        } else {
            for (var i=0; i< self.venues().length; i++){
                var marker = self.venues()[i].marker();
                var image = marker.getIcon();
                image.scaledSize = new google.maps.Size(22, 40);
                marker.setIcon(image);
            }
        }
        setMidPointAndBounds();
        drawMap();
        if(currentVenue()){
            focusOnLocationWithDetail(currentVenue());            
        }*/
        //location.reload();
    }, false);

    //helper function to set boudns and center for the map.
    function setMidPointAndBounds(){
        var midpoint = {};
        var latMin = ko.observable(self.filteredVenues()[0].lat());
        var latMax = ko.observable(self.filteredVenues()[0].lat());
        var lngMin = ko.observable(self.filteredVenues()[0].lng());
        var lngMax = ko.observable(self.filteredVenues()[0].lng());
        for (var i=0; i< self.filteredVenues().length; i++){
            if(self.filteredVenues()[i].lat() > latMax())
                latMax(self.filteredVenues()[i].lat());
            else if(self.filteredVenues()[i].lat() < latMin())
                latMin(self.filteredVenues()[i].lat());
            if(self.filteredVenues()[i].lng() > lngMax())
                lngMax(self.filteredVenues()[i].lng());
            else if(self.filteredVenues()[i].lng() < lngMin())
                lngMin(self.filteredVenues()[i].lng());
        }
        midpoint.lat = ko.computed(function(){return (latMax()+latMin())/2;});
        midpoint.lng = ko.computed(function(){return (lngMax()+lngMin())/2;});
        var center = new google.maps.LatLng(midpoint.lat(), midpoint.lng());
        map.setCenter(center);
        var bounds = new google.maps.LatLngBounds();
        var ne = new google.maps.LatLng(latMax(), lngMax());
        var sw = new google.maps.LatLng(latMin(), lngMin());
        bounds.extend(ne);
        bounds.extend(sw);
        map.fitBounds(bounds);
        if (map.getZoom() > 18){
            map.setZoom(18);
        }
    }

    //create a map using the list of filtered venues.
    function drawMap(){
        setMidPointAndBounds();
        for (var i =0; i<self.venues().length; i++){
            self.venues()[i].marker().setMap(null);
        }
        //drop markers on each venue and bind an event on each click on marker.
        for (var i =0; i<self.filteredVenues().length; i++){
            self.filteredVenues()[i].marker().setMap(map);
            google.maps.event.addListener(self.filteredVenues()[i].marker(), 'click', function(){
                focusOnLocationWithDetail(this);
            });
        }
    }
    //initiate map.
    drawMap();

    //this is object for a google map info windo.
    var infoWindow = new google.maps.InfoWindow();

    function initInfoWindow(marker){
        var venue = null;
        for (var i =0; i<self.filteredVenues().length; i++){
            if (self.filteredVenues()[i].id()==marker.id){
                venue = self.filteredVenues()[i];
                break;
            }
        }
        //tried to do a databind in knockout, but this was a more straightforward way to generate the info window.
        
        //create a infoWindow container
        var infoWindowContainer = document.createElement("div");
        infoWindowContainer.id = "container-"+venue.id();
        infoWindowContainer.classList.add("info-container");

        //create a name element
        var locationName = document.createElement("h2");
        locationName.classList.add("info-location-name");
        locationName.innerHTML = venue.name();
        infoWindowContainer.appendChild(locationName);

        //create a category element
        var locationCategory = document.createElement("h3");
        locationCategory.classList.add("location-category");
        locationCategory.innerHTML = venue.category();
        infoWindowContainer.appendChild(locationCategory);

        //add rating and link
        var locationRatingAndLink = document.createElement("div");
        locationRatingAndLink.classList.add("location-rating-and-link");
        infoWindowContainer.appendChild(locationRatingAndLink);

        //change the color of rating based on the value
        var locationRating = document.createElement("span");
        locationRating.classList.add("location-rating");
        locationRating.innerHTML = venue.formattedRatingText();
        locationRating.style.color = venue.ratingColor();
        locationRatingAndLink.appendChild(locationRating);

        //add link to the link logo
        var locationLink = document.createElement("a");
        locationLink.classList.add("location-link");
        locationLink.href = venue.url();
        locationRatingAndLink.appendChild(locationLink);

        var locationLinkLogo = document.createElement("img");
        locationLinkLogo.classList.add("link-icon");
        locationLinkLogo.src = "images/link-icon.png";
        locationLink.appendChild(locationLinkLogo);

        //add address
        var locationAddress = document.createElement("p");
        locationAddress.classList.add("info-location-address");
        locationAddress.innerHTML = venue.formattedAddressText();
        infoWindowContainer.appendChild(locationAddress);

        //add pictures. sourced from outside
        var locationPictures = document.createElement("div");
        locationPictures.classList.add("location-pictures");
        infoWindowContainer.appendChild(locationPictures);

        for (var i = 0; i<venue.photos().length; i++){
            var locationPicture = document.createElement("img");
            locationPicture.classList.add("location-picture");
            locationPicture.src = venue.photos()[i].prefix+"200x200"+venue.photos()[i].suffix;
            locationPictures.appendChild(locationPicture);
        }


        infoWindow.setContent(infoWindowContainer);

        //find the relevant marker and open based on that.
        infoWindow.open(marker.getMap(), marker);
    }

    var currentVenue = ko.observable();
    var previousVenue = ko.observable();

    //clean up the map
    function cleanMap(){
        if(infoWindow){
            infoWindow.close();
        }
        if(currentVenue()){
            currentVenue().setIcon("");
            currentVenue(null);
        }
        if(previousVenue()){
            previousVenue(null);
        }
    }

    //on clickof a location venue address, focus on location.
    self.focusOnLocationOnClick = function(venue){
        focusOnLocation(venue.marker());
    };

    //on clickof a location venue name, focus on location and show detail.
    self.focusOnLocationWithDetailOnClick = function(venue){
        focusOnLocationWithDetail(venue.marker());
    };

    //on click of a marker,focus on a location of the marker and show info window.
    function focusOnLocationWithDetail(marker){
        focusOnLocation(marker);
        initInfoWindow(marker);
    }
    //focus the map on a given marker.
    function focusOnLocation(marker){
        infoWindow.close();
        if(currentVenue()){
            previousVenue(currentVenue());
            var image = marker.getIcon();
            //using default icon image.
            image.url = "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-poi.png";
            previousVenue().setIcon(image);            
        }
        currentVenue(marker);
        var image = marker.getIcon();
        //using focused icon image.
        image.url = "http://mt.googleapis.com/vt/icon/name=icons/spotlight/spotlight-waypoint-blue.png";
        marker.setIcon(image);
        var zoomLevel = 14
        //making zoom responsive.
        if(getMediaState()){
            zoomLevel = 16
        }
        marker.getMap().setZoom(zoomLevel);
        marker.getMap().setCenter(marker.position);
    }
}
//apply data bind to the view.
ko.applyBindings(new ViewModel());