exports.ApplicationWindow = function() {
	//create object instance
	var lat, lon;
	if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad') {
		if (Ti.Geolocation.locationServicesEnabled) {
    		Ti.Geolocation.purpose = 'Get Current Location';
    		Ti.Geolocation.distanceFilter = 10;
    		Titanium.Geolocation.addEventListener('location', function(e) {
        		if (e.error) {
            		alert('Error: ' + e.error);
        		} else {
            		lat = e.coords.latitude;
            		lon = e.coords.longitude;
        		}
    		});	
		}else {
    		alert('Please enable location services');
		}
	}else if (Ti.Platform.osname === 'android') {
		var providerGps = Ti.Geolocation.Android.createLocationProvider({
			name : Ti.Geolocation.PROVIDER_GPS,
			minUpdateDistance : 10.0
		});
		Ti.Geolocation.Android.addLocationProvider(providerGps);
		Ti.Geolocation.Android.manualMode = true;
		var locationCallback = function(e) {
			if (!e.success || e.error) {
				Ti.API.info('error:' + JSON.stringify(e.error));
			} else {
				lat = parseFloat(JSON.stringify(e.coords.latitude));
				lon = parseFloat(JSON.stringify(e.coords.longitude));
			}
		};
		Titanium.Geolocation.addEventListener('location', locationCallback);	
	}
	var self = Ti.UI.createWindow({
		backgroundColor : '#fff',
		title : 'Map View',
		fullscreen : false,
		exitOnClose : true,
		navBarHidden : false
	});
	var listScreen = Titanium.UI.createWindow({
		title : 'List View',
		backgroundColor : '#fff',
		navBarHidden : false
	});
	var nav1;
	var etaWin;
	var buttonPressed = false;
	function normalize(string){
		string = string.toLowerCase();
		var stringA = string.split(" ");
		var finalString = '';
		for (var i = 0; i < stringA.length; i++){
			var c = stringA[i].charAt(0);
			c = c.toUpperCase();
			var temp = stringA[i].split("");
			for (var j = 1; j < temp.length; j++){
				c = c.concat(temp[j]);
			}
			if (i !== 0){
				finalString = finalString.concat(" ");
			}
			finalString = finalString.concat(c);
		}
		return finalString;
	}
	//reading in information about the stops
	function getStops(route) {
		var f = Ti.Filesystem.getFile(Ti.Filesystem.resourcesDirectory, route);
		var contents = f.read();
		Ti.API.info('Output text of the file: ' + contents.text);
		var conversion = contents.toString();
		var conversion2 = conversion.split(";");
		var conversion3 = [];
		for (var i = 0; i < ((conversion2.length / 5) - 1); i++) {
			conversion3[i] = {
				number : conversion2[i * 5],
				name : conversion2[i * 5 + 1],
				lat : conversion2[i * 5 + 2],
				lon : conversion2[i * 5 + 3],
				side : conversion2[i * 5 + 4]
			}
		}
		return conversion3;
	}
	var stopsLoop = getStops('Loop Stops.txt');
	var stopsUpper = getStops('Upper Campus Stops.txt');
	var stopsWest = getStops('West Night Core Stops.txt');
	var stopsEast = getStops('East Night Core Stops.txt');

	//getting all the stops exclusively in one variable
	function combine (first, second){
		var result = first.concat(second);
		if (first.length === 0 && second.length !== 0){
			return second;
		}else if (first.length !== 0 && second.length === 0){
			return first;
		}else if (first.length === 0 && second.length === 0){
			return [];
		}else{
			var indices = [];
			for (var i = 0; i < result.length; i++) {
				for (var j = i + 1; j < result.length; j++) {
					if (result[i].name === result[j].name && result[i].side === result[j].side) {
						indices.push(j);
					}
				}
			}
			var output = [];
			var count = 0;
			for (var j = 0; j < result.length; j++){
				for (var i = 0; i < indices.length; i++) {
					if (j === indices[i]){
						count = count + 1;
					}
				}
				if (count === 0){
					output.push(result[j]);
				}
				count = 0;
			}
			return output;
		}
	}
	var one = combine(stopsLoop,stopsUpper);
	var two = combine(one,stopsWest);
	var stops = combine(two,stopsEast);

	var mapview;
	var annotations;
	var etaArray = [];
	var allBusNumbers = [];
	var annotationBuses = [];
	var busButton = [];
	var temp = [];
	var temp2 = [];
	var temp3 = [];
	var updateSeconds = [];
	var refreshTime;
	var converter = 3000;
	var animation = new Boolean();
	animation = true;
	//creating the button to open List View
	var listB = Ti.UI.createButton({
		title : 'List View',
		top : '0dp',
		left : '0dp',
		width : '90dp',
		height : '35dp'
	});
	var etaButton = [];
	for (var i = 0; i < stops.length; i++) {
		etaButton[i] = Ti.UI.createButton({
			title : 'ETAs',
			id : i,
			height : 32,
			width : 50,
		})
	}
	var destinationButton = [];
	for (var i = 0; i < stops.length; i++) {
		destinationButton[i] = Ti.UI.createButton({
			title : 'Dest',
			id : i,
			height : 32,
			width : 50,
		})
	}
	var about = Ti.UI.createLabel({
		text: "About",
		width: 28,
		font: {
			fontSize: 9
		},
		color: '#ccc',
		textAlign: 'center',
		bottom: 8,
		left: 40
	});
	var lineView = Titanium.UI.createView({
        width: about.width,
        left: about.left,
        height: 1,
        backgroundColor: '#ccc',
        bottom: 9
    });
 	about.addEventListener('click', function(e) {
    	Titanium.Platform.openURL('http://inrg.cse.ucsc.edu/inrgwiki/Projects');
	});
	var routeChoose = Ti.UI.createPicker({
		top: 40
	});
	var routeData = [];
	routeData[0]=Ti.UI.createPickerRow({title:'All'});
	routeData[1]=Ti.UI.createPickerRow({title:'Loop'});
	routeData[2]=Ti.UI.createPickerRow({title:'Upper Campus'});
	routeData[3]=Ti.UI.createPickerRow({title:'West Night Core'});
	routeData[4]=Ti.UI.createPickerRow({title:'East Night Core'});
	routeData[5]=Ti.UI.createPickerRow({title:'None'});
	routeChoose.add(routeData);
	routeChoose.selectionIndicator = true;
	var routeButton = Ti.UI.createButton({
		title : 'Pick Route',
		right : 5,
		height : 35,
		width : 90,
		top : 0
	});
	routeButton.addEventListener('click', function(e){
		self.add(routeChoose);
	});
	var userRoute = 'All';
	routeChoose.addEventListener('change', function(e){
		userRoute = routeChoose.getSelectedRow(0).title;
		self.remove(routeChoose);
	});
	// add map after window opens
	self.addEventListener('open', function() {
		// Make sure we only add the map once
		if (mapview !== undefined) {
			return;
		}
		var url = "http://skynet.cse.ucsc.edu/bts/coord2.xml";
		//  rss feed url
		var xhr = Titanium.Network.createHTTPClient();
		var imageURL = "images/BTSLogoCrop_28_34";
		var items = [];
		function pickBusIcon(string) {
			string = string.toLowerCase();
			if (string === "loop") {
				imageURL = "images/LOOPbusS.png";
			} else if (string === "upper campus") {
				imageURL = "images/UPPERbusS.png";
			} else if (string === "east night core") {
				imageURL = "images/EASTNIGHTbusS.png";
			} else if (string === "west night core") {
				imageURL = "images/WESTNIGHTbusS.png";
			} else {
				imageURL = "images/BTSLogoCrop_28_34.png";
			}
		}
		function loadXML() {
			for (var i = 0; i < items.length; i++) {
				pickBusIcon(items.item(i).getElementsByTagName("route").item(0).text);
				busButton[i] = Ti.UI.createButton({
					title : 'Info',
					id : items.item(i).getElementsByTagName("id").item(0).text,
					height : 32,
					width : 50
				})
				busButton[i].addEventListener('click', function(e) {
					Ti.App.fireEvent('buttonPressed', {name: e.source.id});
				});
				if (userRoute === 'All'){
					annotationBuses[i] = Ti.Map.createAnnotation({
						animate : animation,
						title : 'Bus ' + items.item(i).getElementsByTagName("id").item(0).text,
						subtitle : items.item(i).getElementsByTagName("route").item(0).text,
						latitude : parseFloat(items.item(i).getElementsByTagName("lat").item(0).text),
						longitude : parseFloat(items.item(i).getElementsByTagName("lng").item(0).text),
						image : imageURL,
						leftView : busButton[i]
					})
					mapview.addAnnotation(annotationBuses[i]);
				}else if (userRoute !== 'None'){
					if (items.item(i).getElementsByTagName("route").item(0).text.toLowerCase() === userRoute.toLowerCase()){
						annotationBuses[i] = Ti.Map.createAnnotation({
							animate : animation,
							title : 'Bus ' + items.item(i).getElementsByTagName("id").item(0).text,
							subtitle : items.item(i).getElementsByTagName("route").item(0).text,
							latitude : parseFloat(items.item(i).getElementsByTagName("lat").item(0).text),
							longitude : parseFloat(items.item(i).getElementsByTagName("lng").item(0).text),
							image : imageURL,
							leftView : busButton[i]
						})
						mapview.addAnnotation(annotationBuses[i]);
					}
				}
				allBusNumbers[i] = parseInt(items.item(i).getElementsByTagName('id').item(0).text);
				temp[i] = items.item(i).getElementsByTagName("predictions").item(0).text;
				temp2[i] = temp[i].toString();
				temp3[i] = temp2[i].split(',');
				for (var g=0; g < temp3[i].length; g++){
					if (temp3[i][g] !== ''){
						temp3[i][g] = parseInt(temp3[i][g]);
					}
				}
				var cArray;
				var route = items.item(i).getElementsByTagName("route").item(0).text.toString().toLowerCase();
				if (route === "loop"){
					cArray = stopsLoop;
				}else if (route === "upper campus"){
					cArray = stopsUpper;
				}else if (route === "west night core"){
					cArray = stopsWest;
				}else if (route === "east night core"){
					cArray = stopsEast;
				}
				var side;
				if (route === "loop" || route === "upper campus"){
					var minIndex;
					var minEta;
					for (var j = 0; j < temp3[i].length; j++){
						if (j === 0){
							minIndex = 1;
							minEta = temp3[i][0];
						}
						else{
							if (temp3[i][j] < minEta){
								minEta = temp3[i][j];
								minIndex = j + 1;
							}
						}
					}
					side = cArray[minIndex].side;
				}else if (route === "west night core" || route === "east night core"){
					side = "none";
				}
				etaArray[parseInt(items.item(i).getElementsByTagName('id').item(0).text)] = {
					name : parseInt(items.item(i).getElementsByTagName('id').item(0).text),
					route : items.item(i).getElementsByTagName("route").item(0).text,
					side : side, 
					etas : temp3[i]
				};
			}
			refreshTime = parseFloat(items.item(0).getElementsByTagName("update_seconds").item(0).text);
			//placed here because Titanium does not allow the double reading through an XML file
			converter = refreshTime * 1000;
			animation = false;

		};
		xhr.onload = function initialLoad() {
			var result = this.responseText;
			var doc = Ti.XML.parseString(result);
			items = doc.getElementsByTagName("marker");
			loadXML();
		}
		var count = 0;
		xhr.onerror = function(e) {
			count = count + 1;
			var actual_error = e.error;
			if (count === 1){
				var networkCheck = Ti.UI.createAlertDialog({
    				message: actual_error,
    				ok: 'Okay',
    				title: 'Network Error'
  				})
  				networkCheck.show();
  				networkCheck.addEventListener('click', function(e){
  					networkCheck.hide();
  					count = 0;
  				})
			}
		}		
		function getXML() {
			for (var i = 0; i < items.length; i++) {
				mapview.removeAnnotation(annotationBuses[i]);
			}
			xhr.open('GET', url);
			xhr.send();
		}

		setInterval(getXML, converter);

		mapview = Titanium.Map.createView({
			mapType : Titanium.Map.HYBRID_TYPE,
			region : {
				latitude : 36.9905295,
				longitude : -122.059267,
				latitudeDelta : .0131255,
				longitudeDelta : .011247
			},
			animate : true,
			regionFit : true,
			userLocation : true,
			annotations : annotations,
			top : '0dp'
		});
		var str = "images/Bus-Station-inner.png";
		function chooseImage(string){
			if (string === "outer"){
				str = "images/blue-disk.png";
			}
			else{
				str = "images/orange-disk.png";
			}
		}
		//creating the annotations for the bus stops
		var annotationsStops = [];
		for (var i = 0; i < stops.length; i++) {
			var yesSide;
			if (stops[i].side === "none"){
				yesSide = "";
			}else{
				yesSide = stops[i].side
			}
			chooseImage(stops[i].side.toLowerCase());
			annotationsStops[i] = Ti.Map.createAnnotation({
				latitude : parseFloat(stops[i].lat),
				longitude : parseFloat(stops[i].lon),
				title : stops[i].name,
				subtitle : yesSide,
				animate : true,
				image: str,
				leftView : etaButton[i],
				rightView : destinationButton[i]
			})
			mapview.addAnnotation(annotationsStops[i]);
		}
// Handle all map annotation clicks
		mapview.addEventListener('click', function(e) {
			if (e.annotation && (e.clicksource === 'leftButton' || e.clicksource === 'leftPane')) {
				mapview.removeAnnotation(e.annotation);
			}
		});
		var resetButton = Titanium.UI.createButton(
        {
            style : 1,
            title : 'Test',
            width: 20,
            height: 20,
            bottom: 20
        });
        resetButton.addEventListener('click', function(e)
        {
            mapview.setLocation(
            {
                latitude : 36.9905295,
                longitude : -122.059267,
                animate : true,
                latitudeDelta : 0.0131255,
                longitudeDelta : 0.011247
            });
        });
		self.add(mapview);
		mapview.add(resetButton);
		self.add(listB);
		self.add(routeButton);
		self.add(listButton[0]);
		self.add(about);
		self.add(lineView);
	});	
	
	function order (finalD, distShortest){
		var final;
		for (var i = 0; i < distShortest.length; i++){
			if (distShortest[i][1] === finalD[1] && distShortest[i][2] === finalD[2]){
				final = distShortest[i];
			}
		}
		return final;
	}
	function closestStopOnRoute(destination) {//takes in NAME of destination stop, not entire object litteral, but returns object litteral
		var distShortest = [];
		var distances = [];
		var min;
		var go1 = false;
		var go2 = false;
		var go3 = false;
		var go4 = false;
		var go5 = false;
		var go6 = false;
		var upperInnerSide;
		var upperOuterSide;
		var westDestSide;
		var eastDestSide;
		var distShortest1 = {};
		for (var i = 0; i < stopsLoop.length; i++) {
			if (stopsLoop[i].name === destination && stopsLoop[i].side === 'inner') {
				go1 = true;
				break;
			}
		}
		if (go1){				
			var num;
			for (var i = 0; i < stopsLoop.length; i++){
				if (stopsLoop[i].side === "inner"){
					distS = (lat - stopsLoop[i].lat) * (lat - stopsLoop[i].lat) + (lon - stopsLoop[i].lon) * (lon - stopsLoop[i].lon);
					distShortest1 = stopsLoop[i];
					num = i;
					break;
				}
			}
			for (var j = num; j < stopsLoop.length; j++) {
				if (stopsLoop[j].side === 'inner'){
					dist = (lat - stopsLoop[j].lat) * (lat - stopsLoop[j].lat) + (lon - stopsLoop[j].lon) * (lon - stopsLoop[j].lon);
					if (dist < distS) {
						distS = dist;
						distShortest1 = stopsLoop[j];
					}
				}
			}	
			distShortest.push([distShortest1,"Loop","inner"]);
		}
		var distShortest2 = {};
		for (var i = 0; i < stopsLoop.length; i++) {
			if (stopsLoop[i].name === destination && stopsLoop[i].side === 'outer') {
				go2 = true;
				break;
			}
		}
		if (go2){				
			var num;
			for (var i = 0; i < stopsLoop.length; i++){
				if (stopsLoop[i].side === "outer"){
					distS = (lat - stopsLoop[i].lat) * (lat - stopsLoop[i].lat) + (lon - stopsLoop[i].lon) * (lon - stopsLoop[i].lon);
					distShortest2 = stopsLoop[i];
					num = i;
					break;
				}
			}
			for (var j = num; j < stopsLoop.length; j++) {
				if (stopsLoop[j].side === 'outer'){
					dist = (lat - stopsLoop[j].lat) * (lat - stopsLoop[j].lat) + (lon - stopsLoop[j].lon) * (lon - stopsLoop[j].lon);
					if (dist < distS) {
						distS = dist;
						distShortest2 = stopsLoop[j];
					}
				}
			}
			distShortest.push([distShortest2,"Loop","outer"]);
		}
		var distShortest3 = {};
		for (var i = 0; i < stopsUpper.length; i++) {
			if (stopsUpper[i].name === destination && stopsUpper[i].side === 'inner') {
				go3 = true;
				break;
			}
		}
		if (go3){				
			var num;
			for (var i = 0; i < stopsUpper.length; i++){
				if (stopsUpper[i].side === "inner"){
					distS = (lat - stopsUpper[i].lat) * (lat - stopsUpper[i].lat) + (lon - stopsUpper[i].lon) * (lon - stopsUpper[i].lon);
					distShortest3 = stopsUpper[i];
					num = i;
					break;
				}
			}
			for (var j = num; j < stopsUpper.length; j++) {
				if (stopsUpper[j].side === 'inner'){
					dist = (lat - stopsUpper[j].lat) * (lat - stopsUpper[j].lat) + (lon - stopsUpper[j].lon) * (lon - stopsUpper[j].lon);
					if (dist < distS) {
						distS = dist;
						distShortest3 = stopsUpper[j];
					}
				}
			}
			distShortest.push([distShortest3,"Upper Campus","inner"]);
		}
		var distShortest4 = {};
		for (var i = 0; i < stopsUpper.length; i++) {
			if (stopsUpper[i].name === destination && stopsUpper[i].side === 'outer') {
				go4 = true;
				break;
			}
		}
		if (go4){				
			var num;
			for (var i = 0; i < stopsUpper.length; i++){
				if (stopsUpper[i].side === "outer"){
					distS = (lat - stopsUpper[i].lat) * (lat - stopsUpper[i].lat) + (lon - stopsUpper[i].lon) * (lon - stopsUpper[i].lon);
					distShortest4 = stopsUpper[i];
					num = i;
					break;
				}
			}
			for (var j = num; j < stopsUpper.length; j++) {
				if (stopsUpper[j].side === 'outer'){
					dist = (lat - stopsUpper[j].lat) * (lat - stopsUpper[j].lat) + (lon - stopsUpper[j].lon) * (lon - stopsUpper[j].lon);
					if (dist < distS) {
						distS = dist;
						distShortest2 = stopsUpper[j];
					}
				}
			}
			distShortest.push([distShortest4,"Upper Campus","outer"]);
		}
		var distShortest5 = {};
		for (var i = 0; i < stopsWest.length; i++) {
			if (stopsWest[i].name === destination) {
				go5 = true;
				break;
			}
		}
		if (go5){				
			distS = (lat - stopsWest[0].lat) * (lat - stopsWest[0].lat) + (lon - stopsWest[0].lon) * (lon - stopsWest[0].lon);
			distShortest5 = stopsWest[0];
			for (var j = 1; j < stopsWest.length; j++) {
				dist = (lat - stopsWest[j].lat) * (lat - stopsWest[j].lat) + (lon - stopsWest[j].lon) * (lon - stopsWest[j].lon);
				if (dist < distS) {
					distS = dist;
					distShortest5 = stopsWest[j];
				}
			}
			distShortest.push([distShortest5,"West Night Core","none"]);
		}
		var distShortest6 = {};
		for (var i = 0; i < stopsEast.length; i++) {
			if (stopsEast[i].name === destination) {
				go6 = true;
				break;
			}
		}
		if (go6){				
			distS = (lat - stopsEast[0].lat) * (lat - stopsEast[0].lat) + (lon - stopsEast[0].lon) * (lon - stopsEast[0].lon);
			distShortest6 = stopsEast[0];		
			for (var j = 1; j < stopsEast.length; j++) {
				dist = (lat - stopsEast[j].lat) * (lat - stopsEast[j].lat) + (lon - stopsEast[j].lon) * (lon - stopsEast[j].lon);
				if (dist < distS) {
					distS = dist;
					distShortest6 = stopsEast[j];
				}
			}
			distShortest.push([distShortest6,"East Night Core","none"]);
		}
		if (distShortest.length === 0){
			alert ("Sorry. No route could be configured to get to " + destination);
			return "this should never happen";
		}else if (distShortest.length === 1){
			return [distShortest[0]];
		}else {
			for (var j = 0; j < distShortest.length; j++){
				if (distShortest[j][1] === "Loop" && distShortest[j][2] === 'inner'){
					var index;
					var count = 0;
					var leave = false;
					for (var i = 0; i < stopsLoop.length; i++){
						if (stopsLoop[i].name === distShortest[j][0].name && stopsLoop[i].side === distShortest[j][2]){
							index = i + 1;
						}
					}
					for (var i = index; i < stopsLoop.length; i++){
						if (stopsLoop[i].name === destination && stopsLoop[i].side === 'inner'){
							break;
						}
						if (stopsLoop[i].side === 'inner'){
							count = count + 1;
						}
						if (i === stopsLoop.length - 1 && leave === false){
							i = -1;
						}
					}
					distances.push([count, "Loop", 'inner']);
				}
				if (distShortest[j][1] === "Loop" && distShortest[j][2] === 'outer'){
					var index;
					var count = 0;
					var leave = false;
					for (var i = 0; i < stopsLoop.length; i++){
						if (stopsLoop[i].name === distShortest[j][0].name && stopsLoop[i].side === distShortest[j][2]){
							index = i - 1;
							break;
						}
					}
					for (var i = index; i < stopsLoop.length;){
						if (stopsLoop[i].name === destination && stopsLoop[i].side === 'outer'){
							break;
						}
						if (stopsLoop[i].side === 'outer'){
							count = count + 1;
						}
						if (i === 0 && leave === false){
							i = stopsLoop.length;
						}
						i = i - 1;
					}
					distances.push([count, "Loop", 'outer']);
				}
				if (distShortest[j][1] === "West Night Core"){
					var index;
					var count = 0;
					var leave = false;
					for (var i = 0; i < stopsWest.length; i++){
						if (stopsWest[i].name === distShortest[j][0].name && stopsWest[i].side === distShortest[j][0].side){
							index = i + 1;
						}
					}
					for (var i = index; i < stopsWest.length; i++){
						if (stopsWest[i].name === destination){
							westDestSide = stopsWest[i].side;
							leave = true;
							break;
						}
						count = count + 1;
						if (i === stopsWest.length - 1 && leave === false){
							i = -1;
						}
					}
					distances.push([count, "West Night Core", 'none']);
				}
				if (distShortest[j][1] === "East Night Core"){
					var index;
					var count = 0;
					var leave = false;
					for (var i = 0; i < stopsEast.length; i++){
						if (stopsEast[i].name === distShortest[j][0].name && stopsEast[i].side === distShortest[j][0].side){
							index = i + 1;
						}
					}
					for (var i = index; i < stopsEast.length; i++){
						if (stopsEast[i].name === destination){
							eastDestSide = stopsEast[i].side;
							leave = true;
							break;
						}
						count = count + 1;
						if (i === stopsEast.length - 1 && leave === false){
							i = -1;
						}
					}
					distances.push([count, "East Night Core", 'none']);
				}
				if (distShortest[j][1] === "Upper Campus" && distShortest[j][2] === 'inner'){
					var index;
					var count = 0;
					var leave = false;
					var onSide = 'inner';
					for (var i = 0; i < stopsUpper.length; i++){
						if (stopsUpper[i].name === distShortest[j][0].name && stopsUpper[i].side === distShortest[j][2]){
							index = i + 1;
						}
					}
					for (var i = index; i < stopsUpper.length;){
						if (stopsUpper[i].name === destination && stopsUpper[i].side === onSide){
							leave = true;
							upperInnerSide = onSide;
							break;
						}
						if (stopsUpper[i].side === onSide){
							count = count + 1;
						}
						if (onSide = 'inner'){
							i = i + 1;
						} else {
							i = i - 1;
						}
						if (i === stopsUpper.length - 1 && leave === false){
							onSide = 'outer';
						}
						if (i === 0 && leave === false){
							onSide = 'inner';
						}
					}
					distances.push([count, "Upper Campus", 'inner']);
				}
				if (distShortest[j][1] === "Upper Campus" && distShortest[j][2] === 'outer'){
					var index;
					var count = 0;
					var leave = false;
					var onSide = 'outer';
					for (var i = 0; i < stopsUpper.length; i++){
						if (stopsUpper[i].name === distShortest[j][0].name && stopsUpper[i].side === distShortest[j][2]){
							index = i - 1;
							break;
						}
					}
					for (var i = index; i < stopsUpper.length;){
						if (stopsUpper[i].name === destination && stopsUpper[i].side === onSide){
							leave = true;
							upperOuterSide = onSide;
							break;
						}
						if (stopsUpper[i].side === onSide){
							count = count + 1;
						}
						if (onSide = 'inner'){
							i = i + 1;
						} else {
							i = i - 1;
						}
						if (i === stopsUpper.length - 1 && leave === false){
							onSide = 'outer';
						}
						if (i === 0 && leave === false){
							onSide = 'inner';
						}
					}
					distances.push([count, "Upper Campus", 'outer']);
				}
			}
			var finalDistances = [];
			for (var i = 0; i < distances.length; i++) {
				if (i === 0) {
					finalDistances.push(distances[i]);
				} else {
					for (var x = 0; x < finalDistances.length;) {
						if (distances[i][0] < finalDistances[x][0]) {
							finalDistances.splice(x, 0, distances[i]);
							break;
						}else {
							x++;
						}
						if (x === finalDistances.length) {
							finalDistances.push(distances[i]);
							break;
						}
					}
				}
			}
			for (var i = 0; i < finalDistances.length;){
				var busCount = 0;
				for (var j = 0; j < allBusNumbers.length; j++){
					if (finalDistances[i][1].toLowerCase() === "loop"){
						if (etaArray[allBusNumbers[j]].route.toLowerCase() === finalDistances[i][1].toLowerCase() && etaArray[allBusNumbers[j]].side.toLowerCase() === finalDistances[i][2].toLowerCase()){
							busCount = busCount + 1;
						}	
					}else{
						if (etaArray[allBusNumbers[j]].route.toLowerCase() === finalDistances[i][1].toLowerCase()){
							busCount = busCount + 1;
						}
					}
				}
				if (busCount === 0){
					finalDistances.splice(i, 1);
				} else{
					i = i + 1;
				}
			}
			var finalA = [];
			if (finalDistances.length === 0){
				alert ("Sorry. No route could be configured to get to " + destination);
				return "this should never happen";
			}
			else {
				for (var n = 0; n < finalDistances.length; n++){
					finalA.push(order(finalDistances[n], distShortest));
					if (finalA[n][1] === 'Upper Campus' && finalA[2] === 'inner'){
						finalA[n].push(upperInnerSide);
					}
					if (finalA[n][1] === 'Upper Campus' && finalA[2] === 'outer'){
						finalA[n].push(upperOuterSide);
					}
					if (finalA[n][i] === 'West Night Core'){
						finalA[n].push(westDestSide);
					}
					if (finalA[n][i] === 'East Night Core'){
						finalA[n].push(eastDestSide);
					}
				}
			}
			return finalA;
		}
	}
	//creating the list for etaWin
	var outputEtas = [];
	var pickerTimer;
	var etaTime;
	function getEtas(input) {//takes in entire object literal as input
		var name = input.name;
		var etaList = Ti.UI.createListView({
			headerTitle : "ETAs for " + name,
		});
		var index = [];
		for (var i = 0; i < stops.length; i++){
			if (stops[i].name === name){
				index.push(stops[i].number-1);
			}
		}
		var initEtas = [];
		for (var i = 0; i < allBusNumbers.length; i++){
			for (var j = 0; j < index.length; j++){
				initEtas.push([allBusNumbers[i], etaArray[allBusNumbers[i]].etas[index[j]], index[j]]);
			}
		}
		for (var i = 0; i < initEtas.length;){
			if (initEtas[i][1] === ''){
				initEtas.splice(i,1);
			}
			else {
				i++;
			}
		}
		var finalEtas = [];
		for (var i = 0; i < initEtas.length; i++) {
			len = finalEtas.length;
			if (len === 0){
				finalEtas.push(initEtas[i]);	
			}else {
				for (var x = 0; x < initEtas.length;){
					if (initEtas[i][1] <= finalEtas[x][1]){
						finalEtas.splice(x,0,initEtas[i]);
						break;
					}
					else{
						x++;
						if (x === finalEtas.length){
							finalEtas.push(initEtas[i]);
							break;
						}
					}
				}
			}
		}
		outputEtas = finalEtas;
		var data = [];
		var sec = [];
		if (finalEtas.length !==0) {
			 var picker = Ti.UI.createPicker({
                top : '250 dp',
                type : Titanium.UI.PICKER_TYPE_COUNT_DOWN_TIMER,
                selectionIndicator : true,
                minuteinterval : 1,
                useSpinner : true,
            });
			for (var i = 0; i < finalEtas.length; i++){
				var route = normalize(etaArray[finalEtas[i][0]].route);
				var yesSide;
				if (route === "Loop"){
					yesSide = ", " + normalize(etaArray[finalEtas[i][0]].side) + " Side";
				}else if (route === "Upper Campus"){
					yesSide = ", " + normalize(etaArray[finalEtas[i][0]].side);
				}else if (route === "West Night Core"){
					var sides = [];
					var indices = [];
					for (var k = 0; k < stopsWest.length; k++){
						if (stopsWest[k].name === input){
							sides.push(stopsWest[k].side);
							indices.push(stopsWest[k].number - 1);
						}
					}
					if (sides.length === 1){
						if (sides[0] === "none"){
							yesSide = "";
						}else{
							yesSide = ", " + normalize(sides[0]);
						}
					}else{
						for (var l = 0; l < indices.length; l++){
							if (indices[l] === finalEtas[i][2]){
								yesSide = ", " + normalize(sides[l]);
							}
						}
					}
				}else if (route === "East Night Core"){
					var sides = [];
					var indices = [];
					for (var k = 0; k < stopsEast.length; k++){
						if (stopsEast[k].name === input){
							sides.push(stopsEast[k].side);
							indices.push(stopsEast[k].number - 1);
						}
					}
					if (sides.length === 1){
						if (sides[0] === "none"){
							yesSide = "";
						}else{
							yesSide = ", " + normalize(sides[0]);
						}
					}else{
						for (var l = 0; l < indices.length; l++){
							if (indices[l] === finalEtas[i][2]){
								yesSide = ", " + normalize(sides[l]);
							}
						}
					}
				}
				if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
					data[i] = [{
						properties : {
							title : route + yesSide,
							subtitle : finalEtas[i][1] + ' minutes',
							accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE,
						},
						template : Ti.UI.LIST_ITEM_TEMPLATE_SETTINGS
					}];
					sec[i] = Titanium.UI.createListSection({
						items : data[i],
					});
				}else{
					data[i] = [{
						properties : {
							title: route + yesSide
						}
					}]
					sec[i] = Titanium.UI.createListSection({
						items : data[i],
						headerTitle : "ETA " + finalEtas[i][1].toString() + " minutes"
					});
				}
				etaList.appendSection(sec[i]);
			}
			etaList.addEventListener('itemclick', function(e)
            {
                etaWin.add(picker);
                etaTime = finalEtas[e.sectionIndex][1];
                alert("Select how many minutes prior to the arrival of this bus you would like to be reminded.");
                picker.show();
            });
            picker.addEventListener('change', function(e)
            {
                var timer = picker.getCountDownDuration();
                var alarmTime = timer / 60000;
                setTimeout(function()
                {
                    Ti.App.fireEvent('foo',
                    {
                        name : alarmTime
                    });
                    if ((timer / 60000) === 1)
                    {
                        alert("You have a bus to catch! It is 1 minute away");
                    }
                    else
                    {
                        alert("You have a bus to catch! It is " + timer / 60000 + " minutes away");
                    }
                }, parseFloat(etaTime - (timer / 60000))*60000);
                picker.hide();
            });
		}
		etaWin = Ti.UI.createWindow({
			backgroundColor : '#fff',
			fullscreen : false,
			exitOnClose : true,
			title : "ETAs"
		});
		if (etaList.sectionCount !== 0){
			etaWin.add(etaList);
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				nav1.open(etaWin);
			}else{
				etaWin.open();
			}
		}
		else {
			alert ("Sorry. There are no current ETAs for this stop.");
		}
	}
	var data = [];
	function createSearchBar() {
		var alreadyAdded = [];
		var yes = false;
		for (var i = 0; i < stops.length; i++) {
			for (var j = 0; j < alreadyAdded.length; j++) {
				if (alreadyAdded[j] === stops[i].name) {
					var yes = true;
					break;
				}
			}
			if (yes === false) {
				var row = Ti.UI.createTableViewRow({
					title : stops[i].name
				});
				data.push(row);
				alreadyAdded.push(stops[i].name);
			} else {
				yes = false;
			}
		}
	}
	var tbl;
	var winTbl = Ti.UI.createWindow({
		backgroundColor : '#fff',
		fullscreen : false,
		exitOnClose : true,
		title : 'Select a Stop'
	});
	var listButton = [];
	for (var t = 0; t < 2; t++) {
		var color;
		if (t === 0){
			color = '#fff';
		}
		if (t === 1){
			color = '#000';
		}
		listButton[t] = Ti.UI.createButton({
			color : color,
			title : "Search",
			style : 2,
			top : 5,
			left : 115
		});
		listButton[t].addEventListener('click', function(e) {
			createSearchBar();
			tbl = Ti.UI.createTableView({
				data : data,
				backgroundColor : 'white'
			});
			winTbl.add(tbl);
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad') {
				nav1.open(winTbl);
			} else {
				winTbl.open();
			}
			tbl.addEventListener('click', function(e) {
				var stopName = e.rowData.title;
				var dialog = Ti.UI.createAlertDialog({
					cancel : 2,
					buttonNames : ['Get ETAS', 'Set As Destination', 'Cancel'],
					message : 'See ETAs for or configure a route to get to ' + stopName,
				});
				dialog.show();
				dialog.addEventListener('click', function(e) {
					if (e.index === 0) {
						var ind;
						for (var n = 0; n < stops.length; n++) {
							if (stops[n].name = stopName) {
								ind = n;
								break;
							}
						}
						getEtas(stops[ind]);
					}else if (e.index === 1) {
						getToDestination(stopName);
					}
				});
			});
		});
	}
	listScreen.add(listButton[1]);
	function listData(){
		var closestStop;
		var distS = (lat - stops[0].lat) * (lat - stops[0].lat) + (lon - stops[0].lon) * (lon - stops[0].lon)
		var dist;
		for (var i = 1; i < stops.length; i++) {
			dist = (lat - stops[i].lat) * (lat - stops[i].lat) + (lon - stops[i].lon) * (lon - stops[i].lon);
			if (dist < distS) {
				distS = dist;
				closestStop = stops[i];
			}
		}
		var name = closestStop.name;
		var initialEtas = Ti.UI.createListView({
			top : 35,
			left : 0,
			width : '100%',
			headerTitle : "ETAs for Your Closest Stop, " + name
		});
		var go = false;
		var go1 = false;
		var go2 = false;
		var go3 = false;
		var indexL = [];
		var indexU = [];
		var indexW = [];
		var indexE = [];
		var allLoopInnerEtas = [];
		var allLoopOuterEtas = [];
		var allUpperInnerEtas = [];
		var allUpperOuterEtas = [];
		var allWestEtas = [];
		var allEastEtas = [];
		var min;
		var dataListScreen = [];
		for (var i = 0; i < stopsLoop.length; i++) {
			if (stopsLoop[i].name === name) {
				go = true;
				indexL.push(stopsLoop[i].number - 1);
			}
		}
		if (go){
			for (var i = 0; i < allBusNumbers.length; i++){
				if (etaArray[allBusNumbers[i]].route.toLowerCase() === "loop"){
					if (etaArray[allBusNumbers[i]].side === 'inner'){
						for (var j = 0; j < indexL.length; j++){
							allLoopInnerEtas.push(etaArray[allBusNumbers[i]].etas[indexL[j]]);
						}
					}
					if (etaArray[allBusNumbers[i]].side === 'outer'){
						for (var j = 0; j < indexL.length; j++){
							allLoopOuterEtas.push(etaArray[allBusNumbers[i]].etas[indexL[j]]);
						}
					}
				}
			}
		}
		for (var i = 0; i < stopsUpper.length; i++) {
			if (stopsUpper[i].name === name) {
				go1 = true;
				indexU.push(stopsUpper[i].number - 1);
			}
		}
		if (go1){
			for (var i = 0; i < allBusNumbers.length; i++){
				if (etaArray[allBusNumbers[i]].route.toLowerCase() === "upper campus"){
					if (etaArray[allBusNumbers[i]].side === 'inner'){
						for (var j = 0; j < indexU.length; j++){
							allUpperInnerEtas.push(etaArray[allBusNumbers[i]].etas[indexU[j]]);
						}
					}
					if (etaArray[allBusNumbers[i]].side === 'outer'){
						for (var j = 0; j < indexU.length; j++){
							allUpperOuterEtas.push(etaArray[allBusNumbers[i]].etas[indexU[j]]);
						}
					}
				}
			}
		}
		for (var i = 0; i < stopsWest.length; i++) {
			if (stopsWest[i].name === name) {
				go2 = true;
				indexW.push(stopsWest[i].number - 1);
			}
		}
		if (go2){
			for (var i = 0; i < allBusNumbers.length; i++){
				if (etaArray[allBusNumbers[i]].route.toLowerCase() === "west night core"){
					for (var j = 0; j < indexW.length; j++){
						allWestEtas.push([etaArray[allBusNumbers[i]].etas[indexW[j]], indexW[j]]);
					}
				}
			}
		}
		for (var i = 0; i < stopsEast.length; i++) {
			if (stopsEast[i].name === name) {
				go3 = true;
				indexE.push(stopsEast[i].number - 1);
			}
		}
		if (go3){
			for (var i = 0; i < allBusNumbers.length; i++){
				if (etaArray[allBusNumbers[i]].route.toLowerCase() === "east night core"){
					for (var j = 0; j < indexE.length; j++){
						allEastEtas.push(etaArray[allBusNumbers[i]].etas[indexE[j]], indexE[j]);
					}
				}
			}
		}
		if (allLoopInnerEtas.length > 0){
			for (var i = 0; i < allLoopInnerEtas.length;) {
				if (allLoopInnerEtas[i] === '') {
					allLoopInnerEtas.splice(i, 1);
				}else{
					i++;
				}
			}
			for (var i = 0; i < allLoopInnerEtas.length; i++){
				if (i === 0) {
					min = allLoopInnerEtas[0];
				}else {
					min = Math.min(min, allLoopInnerEtas[i]);
				};
			}
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				var data = [{
					properties : {
						title : 'Loop, Inner', 
						subtitle : min + ' minutes',
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
					template : Ti.UI.LIST_ITEM_TEMPLATE_SETTINGS
				}];
				var sec1 = Ti.UI.createListSection({
					items : data
				});
				initialEtas.appendSection(sec1);
				dataListScreen.push(data);
			}else{
				var data = [{
					properties : {
						title : 'Loop, Inner Side', 
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
				}];
				var sec1 = Ti.UI.createListSection({
					items : data,
					headerTitle : "ETA " + min + " minutes"
				});
				initialEtas.appendSection(sec1);
				dataListScreen.push(data);
			}
		}
		if (allLoopOuterEtas.length > 0){
			for (var i = 0; i < allLoopOuterEtas.length;) {
				if (allLoopOuterEtas[i] === '') {
					allLoopOuterEtas.splice(i, 1);
				}else{
					i++;
				}
			}
			for (var i = 0; i < allLoopOuterEtas.length; i++){
				if (i === 0) {
					min = allLoopOuterEtas[0];
				} else {
					min = Math.min(min, allLoopOuterEtas[i]);
				};
			}
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				var data = [{
					properties : {
						title : 'Loop, Outer', 
						subtitle : min + ' minutes',
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
					template : Ti.UI.LIST_ITEM_TEMPLATE_SETTINGS
				}];
				var sec2 = Ti.UI.createListSection({
					items : data
				});
				initialEtas.appendSection(sec2);
				dataListScreen.push(data);
			}else{
				var data = [{
					properties : {
						title : 'Loop, Outer Side', 
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
				}];
				var sec2 = Ti.UI.createListSection({
					items : data,
					headerTitle : "ETA " + min + " minutes"
				});
				initialEtas.appendSection(sec2);
				dataListScreen.push(data);
			}
		}
		if (allUpperInnerEtas.length > 0){
			for (var i = 0; i < allUpperInnerEtas.length;) {
				if (allUpperInnerEtas[i] === '') {
					allUpperInnerEtas.splice(i, 1);
				}else{
					i++;
				}
			}
			for (var i = 0; i < allUpperInnerEtas.length; i++){
				if (i === 0) {
					min = allUpperInnerEtas[0];
				} else {
					min = Math.min(min, allUpperInnerEtas[i]);
				};
			}
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				var data = [{
					properties : {
						title : 'Upper Campus, Inner', 
						subtitle : min + ' minutes',
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
					template : Ti.UI.LIST_ITEM_TEMPLATE_SETTINGS
				}];
				var sec3 = Ti.UI.createListSection({
					items : data
				});
				initialEtas.appendSection(sec3);
				dataListScreen.push(data);
			}else{
				var data = [{
					properties : {
						title : 'Upper Campus, Inner', 
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
				}];
				var sec3 = Ti.UI.createListSection({
					items : data,
					headerTitle : "ETA " + min + " minutes"
				});
				initialEtas.appendSection(sec3);
				dataListScreen.push(data);
			}
		}
		if (allUpperOuterEtas.length > 0){
			for (var i = 0; i < allUpperOuterEtas.length;) {
				if (allUpperOuterEtas[i] === '') {
					allUpperOuterEtas.splice(i, 1);
				}else{
					i++;
				}
			}
			for (var i = 0; i < allUpperOuterEtas.length; i++){
				if (i === 0) {
					min = allUpperOuterEtas[0];
				} else {
					min = Math.min(min, allUpperOuterEtas[i]);
				};
			}
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				var data = [{
					properties : {
						title : 'Upper Campus, Outer', 
						subtitle : min + ' minutes',
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
					template : Ti.UI.LIST_ITEM_TEMPLATE_SETTINGS
				}];
				var sec4 = Ti.UI.createListSection({
					items : data
				});
				initialEtas.appendSection(sec4);
				dataListScreen.push(data);
			}else{
				var data = [{
					properties : {
						title : 'Upper Campus, Outer', 
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
				}];
				var sec4 = Ti.UI.createListSection({
					items : data,
					headerTitle : "ETA " + min + " minutes"
				});
				initialEtas.appendSection(sec4);
				dataListScreen.push(data);
			}
		}
		if (allWestEtas.length > 0){
			for (var i = 0; i < allWestEtas.length;) {
				if (allWestEtas[i][0] === '') {
					allWestEtas.splice(i, 1);
				}else{
					i++;
				}
			}
			for (var i = 0; i < allWestEtas.length; i++){
				if (i === 0) {
					min = allWestEtas[0][0];
				} else {
					min = Math.min(min, allWestEtas[i][0]);
				};
			}
			var compareInd;
			for (var i = 0; i < allWestEtas.length; i++){
				if (allWestEtas[i][0] === min){
					compareInd = allWestEtas[i][1];
				}
			}
			var sides = [];
			var indices = [];
			for (var k = 0; k < stopsWest.length; k++){
				if (stopsWest[k].name === name){
					sides.push(stopsWest[k].side);
					indices.push(stopsWest[k].number - 1);
				}
			}
			if (sides.length === 1){
				if (sides[0] === "none"){
					yesSide = "";
				}else{
					yesSide = ", " + normalize(sides[0]);
				}
			}else{
				for (var l = 0; l < indices.length; l++){
					if (indices[l] === compareInd){
						yesSide = ", " + normalize(sides[l]);
					}
				}
			}
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				var data = [{
					properties : {
						title : 'West Night Core' + yesSide, 
						subtitle : min + ' minutes',
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
					template : Ti.UI.LIST_ITEM_TEMPLATE_SETTINGS
				}];
				var sec5 = Ti.UI.createListSection({
					items : data
				});
				initialEtas.appendSection(sec5);
				dataListScreen.push(data);
			}else{
				var data = [{
					properties : {
						title : 'West Night Core' + yesSide, 
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
				}];
				var sec5 = Ti.UI.createListSection({
					items : data,
					headerTitle : "ETA " + min + " minutes"
				});
				initialEtas.appendSection(sec5);
				dataListScreen.push(data);
			}
		}
		if (allEastEtas.length > 0){
			for (var i = 0; i < allEastEtas.length;) {
				if (allEastEtas[i] === '') {
					allEastEtas.splice(i, 1);
				}else{
					i++;
				}
			}
			for (var i = 0; i < allEastEtas.length; i++){
				if (i === 0) {
					min = allEastEtas[0];
				} else {
					min = Math.min(min, allEastEtas[i]);
				};
			}
			var compareInd;
			for (var i = 0; i < allEastEtas.length; i++){
				if (allEastEtas[i][0] === min){
					compareInd = allEastEtas[i][1];
				}
			}
			var sides = [];
			var indices = [];
			for (var k = 0; k < stopsEast.length; k++){
				if (stopsEast[k].name === name){
					sides.push(stopsEast[k].side);
					indices.push(stopsEast[k].number - 1);
				}
			}
			if (sides.length === 1){
				if (sides[0] === "none"){
					yesSide = "";
				}else{
					yesSide = ", " + normalize(sides[0]);
				}
			}else{
				for (var l = 0; l < indices.length; l++){
					if (indices[l] === compareInd){
						yesSide = ", " + normalize(sides[l]);
					}
				}
			}
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				var data = [{
					properties : {
						title : 'East Night Core' + yesSide, 
						subtitle : min + ' minutes',
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
					template : Ti.UI.LIST_ITEM_TEMPLATE_SETTINGS
				}];
				var sec7 = Ti.UI.createListSection({
					items : data
				});
				initialEtas.appendSection(sec7);
				dataListScreen.push(data);
			}else{
				var data = [{
					properties : {
						title : 'East Night Core' + yesSide, 
						accessoryType : Ti.UI.LIST_ACCESSORY_TYPE_NONE
					},
				}];
				var sec7 = Ti.UI.createListSection({
					items : data,
					headerTitle : "ETA " + min + " minutes"
				});
				initialEtas.appendSection(sec7);
				dataListScreen.push(data);
			}
		}
		if (initialEtas.sectionCount > 0) {
			listScreen.add(initialEtas);
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				nav1.open(listScreen); 
			}else{
				listScreen.open();
			}
		}
		else {
			alert ("Sorry. No Current ETAs for " + name + ', Your Closest Stop');
		}
	}
	var etaScreen = Ti.UI.createWindow({
		backgroundColor : '#fff',
		fullscreen : false,
		exitOnClose : true,
		title : 'Directions'
	});
	var depart1;
	var leave1 = false;
	var countN = 0;
	var departStop;
	var departRoute;
	var destSide;
	var depSide;
	var leave = false;
	function getInfo (n,dest){
		depart1 = closestStopOnRoute(dest);
		if (depart1 === "this should never happen"){
			leave = true;
		}else{
			if (n < depart1.length){
				departStop = depart1[n][0];
				departRoute = depart1[n][1];
				depSide = depart1[n][0].side;
				destSide;
				if (departRoute === "Upper Campus" || departRoute === "West Night Core" || departRoute === "East Night Core"){
					destSide = depart1[n][2];
				} else {
					destSide = depSide;
				}
				countN = countN + 1;
			}
			else{
				leave1 = true;
			}
		}
	}
	function getToDestination (dest){
		if (countN === 0){
			getInfo(0,dest);
		}
		if (leave === true){
			countN = 0;
			leave = false;
			return;
		}
		if (leave1 === true){
			countN = 0;
			leave1 = false;
			alert ("Sorry. No route could be configured to get to " + dest);
			return;		
		}
		var finalList;
		if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad') {
			finalList = Ti.UI.createListView({
				style : Titanium.UI.iPhone.ListViewStyle.GROUPED,
			});
		} else {
			finalList = Ti.UI.createListView();
		}
		var indexDepart;
		var indexDest;
		var allEtas = [];
		var len;
		var correctArray = [];
		if (departStop.name === dest){
			alert (dest + " is the closest stop to you. Here are the directions on how to walk there.");
			countN = 0;
			return;
		}
		else {
			if (departRoute === "Loop") {
				correctArray = stopsLoop;
			}
			if (departRoute === "Upper Campus") {
				correctArray = stopsUpper;
			}
			if (departRoute === "West Night Core") {
				correctArray = stopsWest;
			}
			if (departRoute === "East Night Core") {
				correctArray = stopsEast;
			}
			for (var i = 0; i < correctArray.length; i++) {
				if (correctArray[i].name === departStop.name && correctArray[i].side === depSide) {
					indexDepart = correctArray[i].number - 1;
				}
				if (correctArray[i].name === dest && correctArray[i].side === destSide) {
					indexDest = correctArray[i].number - 1;
				}
			}		
			for (var i = 0; i < allBusNumbers.length; i++) {
				if (etaArray[allBusNumbers[i]].route.toLowerCase() === departRoute.toLowerCase()) {
					if (etaArray[allBusNumbers[i]].etas[indexDepart] !== "" && etaArray[allBusNumbers[i]].etas[indexDest] !== ""){
						var len = allEtas.length;
						if (len === 0) {
							allEtas.push([etaArray[allBusNumbers[i]].etas[indexDepart], etaArray[allBusNumbers[i]].etas[indexDest]]);
						} else {
							for (var x = 0; x < allEtas.length;) {
								if (etaArray[allBusNumbers[i]].etas[indexDepart] <= allEtas[x][0]) {
									allEtas.splice(x, 0, [etaArray[allBusNumbers[i]].etas[indexDepart], etaArray[allBusNumbers[i]].etas[indexDest]]);
									break;
								} else {
									x++;
								}
								if (x === allEtas.length) {
									allEtas.push([etaArray[allBusNumbers[i]].etas[indexDepart], etaArray[allBusNumbers[i]].etas[indexDest]]);
									break;
								}
							}
						}
					}
				}
			}
			for (var i = 0; i < allEtas.length;) {
				if (allEtas[i][0] === '' || allEtas[i][0] === null || !allEtas[i][0] || allEtas[i][1] === '' || allEtas[i][1] === null || !allEtas[i][1] || allEtas[i][1] < allEtas[i][0]) {
					allEtas.splice(i, 1);
				}
				else {
					i++;
				}
			}
			if (allEtas.length > 3) {
				allEtas.splice(3, allEtas.length - 3);
			}
			if (allEtas.length > 0) {
				var dataDest = [];
				var dataDepart = [];
				for (var i = 1; i < (allEtas.length + 1); i++) {
					dataDepart.push({
						properties : {
							title : 'ETA ' + i + ':  ' + allEtas[i-1][0].toString() + ' minutes',
							//allowsSelection : true
						}
					})
					dataDest.push({
						properties : {
							title : 'ETA ' + i + ':  ' + allEtas[i-1][1].toString() + ' minutes',
							//allowsSelection : true
						}
					})
				}
				var section1 = Titanium.UI.createListSection({
					items : dataDest,
					headerTitle : "Destination: " + dest
				});
				var ySide;
				if (depSide === 'none'){
					ySide = '';
				}else{
					ySide = ", " + normalize(depSide) + " Side";
				}
				var section2 = Titanium.UI.createListSection({
					items : dataDepart,
					headerTitle : "Board Bus At: " + departStop.name + ySide
				});
				finalList.appendSection(section1);
				finalList.appendSection(section2);
				etaScreen.add(finalList);
				if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
					nav1.open(etaScreen); 
				}else{
					etaScreen.open();
				}
				countN = 0;
				return;
			}else {
				getInfo(countN,dest);
				getToDestination(dest); 
			}
		}
	}
	var busScreen;
	function clickBus(number){//takes in entire object literal as input
		var outputList;
		var correctArray;
		var allEtas = [];
		if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad') {
			outputList = Ti.UI.createListView({
				style : Titanium.UI.iPhone.ListViewStyle.GROUPED,
			});
		}else {
			outputList = Ti.UI.createListView();
		}
		var name = "Bus " + number.toString();
		var route;
		var side;
		for (var j = 0; j < allBusNumbers.length; j++){
			var k = allBusNumbers[j];
			if (etaArray[k].name === parseInt(number)){
				route = etaArray[k].route;
				side = etaArray[k].side;
			}
		}
		var yesSide;
		if (route.toLowerCase() === "west night core" || route.toLowerCase() === "east night core"){
			yesSide = ''
		}else{
			yesSide = ", " + normalize(side) + " Side";
		}
		var heading = name + ": " + normalize(route) + " Route" + yesSide;
		var allEtas;
		if (route.toLowerCase() === "loop"){
			correctArray = stopsLoop;
		}
		if (route.toLowerCase() === "upper campus"){
			correctArray = stopsUpper;
		}
		if (route.toLowerCase() === "west night core"){
			correctArray = stopsWest;
		}
		if (route.toLowerCase() === "east night core"){
			correctArray = stopsEast;
		}
		for (var i = 0; i < etaArray[number].etas.length; i++) {
			if (etaArray[number].etas[i] !== ''){
				len = allEtas.length;
				if (len === 0){
					allEtas.push([etaArray[number].etas[i],i+1]);	
				}else {
					for (var x = 0; x < allEtas.length;){
						if (etaArray[number].etas[i] <= allEtas[x][0]){
							allEtas.splice(x,0,[etaArray[number].etas[i],i+1]);
							break;
						}
						else{
							x++;
							if (x === allEtas.length){
								allEtas.push([etaArray[number].etas[i],i+1]);
								break;
							}
						}
					}
				}
			}
		}
		if (allEtas.length > 5){
			allEtas.splice(5, allEtas.length-5);
		}
		var info = [];
		if (allEtas.length > 0){
			for (var i = 0; i < allEtas.length; i++){
				var finalIndex;
				for (var n = 0; n < correctArray.length; n++){
					if (correctArray[n].number == allEtas[i][1]){
						finalIndex = n;
					}
				}
				info.push({
					properties : {
						title : allEtas[i][0] + " min: " + correctArray[finalIndex].name,
						//allowsSelection : true
					}
				})
			}
			var section = Titanium.UI.createListSection({
				items : info,
				headerTitle : heading
			});
			outputList.appendSection(section);
			busScreen = Ti.UI.createWindow({
				backgroundColor : '#fff',
				fullscreen : false,
				exitOnClose : true,
				title : name + " Info"
			});
			busScreen.add(outputList);
			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
				nav1.open(busScreen);
			}else{
				busScreen.open();
			}
		}
		else {
			alert ("Sorry. No information could be found about this bus.");
		}
	}
	//adding event listener to button that opens list view
	listB.addEventListener('click', function(e) {
		listData();
	});
	//the two buttons opened when a stop is clicked
	for (var i = 0; i < stops.length; i++){
		etaButton[i].addEventListener('click', function(e){
			getEtas(stops[e.source.id]);
		})
	}
	for (var i = 0; i < stops.length; i++){
		destinationButton[i].addEventListener('click', function(e) {
			getToDestination(stops[e.source.id].name);
		})
	}
	//assemble view hierarchy
	if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad'){
		nav1 = Ti.UI.iPhone.createNavigationGroup({
			window: self
		})
		var main = Ti.UI.createWindow();
		main.add(nav1);
		main.open();
		//self.add(nav1);
		//self.open();
	}else{
		self.open();
	}
	Ti.App.addEventListener('buttonPressed', function(e){
		clickBus(etaArray[e.name].name);
	})
	return self;
}