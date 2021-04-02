//d3 snippets: https://bl.ocks.org/
// https://observablehq.com/@d3/multi-line-chart

//widgets
let map = undefined;
let barChart = undefined;
let scatterplot = undefined;

//color scales
let clusterColorScale = d3.scaleOrdinal().domain(d3.range(11)).range(['#8dd3c7', '#ffffb3', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']);
let casosConfirmadosColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
let casosPCColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);
let riskExposureColorScale = d3.scaleQuantize().range(['#ffffe5', '#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#8c2d04']);

//
let layerBoundaries = undefined;

//nodes to be analyzed 
let selected_nodes = []

//
let totalPopulation = 0;
let dates = undefined;
let currentDate = undefined;
let casesByDate = {};
let estimateCasesByDate = {};
//
let option;
let threshold = 0;
let showSingletons = true;
let showPolygons = false;
let showGraph = false;
let showBoundaries = true;
let defaultStyle = {
    "weight": 0.5,
    "fillOpacity": 1.0,
    "radius": 5
};
let infectedNodes = {};

// graph
let nodes = []; // {name:,{...}}
let links = []; // [{"source", "target", "value"}]

//markers
let nodeMarkers = {}; // name -> marker
let lines = {}; // n1_n2-> lineMarker
let clusters = [];
let clusterPolygons = [];

//
let selectedPopup = L.popup();

/////////////BAR CHART

function isInfected(node) {
    return node.active_cases > 0;
}

function scatterplotOptionChanged(opt) {
    if (scatterplot) {
	let mydata = [];
	clusters.forEach((cluster, i) => {
	    if (cluster.size > 1 || showSingletons) {
		//
		let populations = cluster.nodes.map((d, i) => {
		    return [nodes[d].population, d]
		});
		populations.sort(function (a, b) { return b[0] - a[0] });
		let mostPopulous = populations[0][1];
		//
		let x = getClusterIndicator(cluster, opt[0]);
		let y = getClusterIndicator(cluster, opt[1]);
		if (x != undefined && y != undefined) {
		    mydata.push([x, y, cluster.color, i, mostPopulous]);
		}
	    }
	});
	//
	scatterplot.setXAxisLabel(opt[2]);
	scatterplot.setYAxisLabel(opt[3]);
	scatterplot.setData(mydata);
    }
}

function barChartOptionChanged(opt) {
    let data = [];
    if (opt.value == 'cases') {
	for (let name in nodes) {
	    let node = nodes[name];
	    data.push({ 'key': name, 'value': node.active_cases });
	}
	barChart.setXAxisLabel('Num Active Cases');
    }
    else if (opt.value == 'casesPC') {
	for (let name in nodes) {
	    let node = nodes[name];
	    data.push({ 'key': name, 'value': node.active_cases / node.population });
	}
	barChart.setXAxisLabel('Active Cases Per Capita');
    }
    else if (opt.value == 'riskExposure') {
	for (let name in nodes) {
	    let node = nodes[name];
	    data.push({ 'key': name, 'value': node.RiskExposure });
	}
	barChart.setXAxisLabel('Risk Exposure');
    }
    else if (opt.value == 'rendaPC') {
	for (let name in nodes) {
	    let node = nodes[name];
	    data.push({ 'key': name, 'value': node.rdpc["mean"] });
	}
	barChart.setXAxisLabel('Per Capita Income');
    }
    else if (opt.value == 'rendaPCNZ') {
	for (let name in nodes) {
	    let node = nodes[name];
	    data.push({ 'key': name, 'value': node.rdpct["mean"] });
	}
	barChart.setXAxisLabel('Per Capita Income (NZ)');
    }
    else {
	for (let name in nodes) {
	    let node = nodes[name];
	    data.push({ 'key': name, 'value': node[opt.value]["mean"] });
	}
	barChart.setXAxisLabel(opt.text);
    }


    data = data.sort(function (a, b) { return b.value - a.value }).slice(0, 7);
    barChart.setData(data);
}

function barSelectedCallback(d) {
    let node = nodes[d];
    selectedPopup.setLatLng({ lat: node.lat, lng: node.lng })
	.setContent("Name: " + d)
	.openOn(map);

}

function scatterPointSelected(id) {
    if (id == undefined) {
	selectedPopup.removeFrom(map);
    }
    else {
	let selCluster = clusters[id];
	let node = nodes[selCluster.nodes[0]];

	//{lat: 51.49901887040356, lng: -0.08342742919921876}
	let suffix = (selCluster.infected) ? 'Força da Infecção: ' + selCluster.forceOfInfection.toFixed(3) : 'Risco de Exposição: ' + selCluster.riskExposure.toFixed(3);
	selectedPopup.setLatLng({ lat: node.lat, lng: node.lng })
	    .setContent("Cluster selecionado " + "</br>" +
			"Tamanho: " + selCluster.size + "</br>" +
			"População: " + selCluster.population +
			"Casos Ativos: " + selCluster.activeCases + "</br>" +
			suffix
		       )
	    .openOn(map);
    }
    //nodeMarkers[selCluster.nodes[0]].openPopup();

}


///////////// MAP


function getClusterIndicator(cluster, indName) {

    if (indName == 'cases') {
	return cluster.activeCases;
    }
    else if (indName == 'population') {
	return cluster.population;
    }
    else if (indName == 'casesPC') {
	return cluster.activeCases / cluster.population;
    }
    else if (indName == 'riskExposure') {
	if (cluster.infected)
	    return undefined;
	else
	    return cluster.riskExposure;
    }
    else if (indName == 'foi') {
	if (cluster.infected)
	    return cluster.forceOfInfection;
	else
	    return undefined;
    }
    else if (indName == 'rdpct' || indName == 'domvulneracomid') {
	let result = 0;
	cluster.nodes.forEach(n => {
	    let node = nodes[n];
	    result += ((node.population / cluster.population) * node[indName]["mean"]);
	});
	return result;
    }
    else if (indName == 'pagro' || indName == 'pcom' || indName == 'pconstr' || indName == 'tdens'
	     || indName == 'pextr' || indName == 'pserv' || indName == 'psiup' || indName == 'ptransf' || indName == "prmaxidoso" || indName == "sobre60" || indName == "rdpc"
	     || indName == 'idhm' || indName == 'idhme' || indName == 'idhml' || indName == 'idhmr') {
	let result = 0;
	cluster.nodes.forEach(n => {
	    let node = nodes[n];
	    result += ((node.population / cluster.population) * node[indName]["mean"] / 100);
	});
	return result;
    }
    else {
	debugger
    }
}

function getIndicator(node, indName) {

    if (indName == 'cases') {
	return node.est_active_cases;
    }
    else if (indName == 'casesPC') {
	return node.est_active_cases / node.population;
    }
    else if (indName == 'riskExposure') {
	if (isInfected(node))
	    return undefined;
	else
	    return node.riskExposure;
    }
    else if (indName == 'foi') {
	if (isInfected(node))
	    return node.forceOfInfection;
	else
	    return undefined;
    }
    else {
	debugger
    }
}

function updateNodes() {
    for (let name in nodes) {
	let node = nodes[name];
	var circle = nodeMarkers[node.name];
	circle.removeFrom(map);
    }


    if (showGraph) {
	clusters.forEach(cl => {
	    cl.nodes.forEach(n => {
		var circle = nodeMarkers[n];
		circle.options.fillColor = circle.options.clusterColor;
		if (cl.size > 1 || showSingletons) {
		    circle.addTo(map);
		    circle.bringToFront();
		}
	    });
	});


    }


}

function updateLinks() {

    for (let key in lines) {
	let line = lines[key];
	line.removeFrom(map);
	line.decorator.removeFrom(map);
    }

    //add lines
    let opacityScale = d3.scaleLinear().domain([0, 100]).range([0, 1]);
    for (let key in lines) {
	let line = lines[key];
	if (showGraph && line.options.value > threshold) {
	    //
	    //let clusterInfected = nodeMarkers[origin].options.clusterInfected;
	    line.options.color = "gray";
	    line.options.opacity = 0.5
	    //
	    line.removeFrom(map);
	    line.decorator.removeFrom(map);
	    line.addTo(map);
	    //line.decorator.addTo(map);
	    //line.decorator.bringToBack();
	}

    }
}

function updateBoundaries() {

	scale = d3.scaleQuantize().range(['#95AF71', '#8CC800', '#E6E200', '#FF7400', '#FF1300', '#B30000']);
	opt = d3.select("#colorSelect").node().selectedOptions[0].value

	let data = [];
    for (let n in nodes) {
		let node = nodes[n];
		if (opt == 'cases'){ data.push(node.active_cases)}
		if (opt == 'casesPC'){ data.push(node.active_cases/node.population)}
		if (opt == 'sobre60'){ data.push(node.sobre60.mean)}
		if (opt == 'rdpc'){ data.push(node.rdpc.mean)}
		if (opt == 'pagro'){ data.push(node.pagro.mean)}
		if (opt == 'pcom'){ data.push(node.pcom.mean)}
		if (opt == 'pconstr'){ data.push(node.pconstr.mean)}
		if (opt == 'pextr'){ data.push(node.pextr.mean)}
		if (opt == 'pserv'){ data.push(node.pserv.mean)}
		if (opt == 'psiup'){ data.push(node.psiup.mean)}
		if (opt == 'ptransf'){ data.push(node.ptransf.mean)}
		if (opt == 'prmaxidoso'){ data.push(node.prmaxidoso.mean)}
		if (opt == 'domvulneracomid'){ data.push(node.domvulneracomid.mean)}
		if (opt == 'tdens'){ data.push(node.tdens.mean)}
		if (opt == 'idhm'){ data.push(node.idhm.mean)}
		if (opt == 'idhme'){ data.push(node.idhme.mean)}
		if (opt == 'idhml'){ data.push(node.idhml.mean)}
		if (opt == 'idhmr'){ data.push(node.idhmr.mean)}
		if (opt == 'water_supply'){ data.push(node.water_supply)}
		if (opt == 'demo_dens'){ data.push(node.demo_dens)}

    }

	let domain = d3.extent(data);
	scale.domain(domain);

	idx = 0
    for (let n in nodes) {
		let node = nodes[n];
		node.boundary.removeFrom(map);
		let color = scale(data[idx]);
		node.boundary.options.fillColor = color;
		test = selected_nodes.filter(node_selected => node_selected.name == node.name)
		if (test.length > 0){
			node.boundary.options.color = 'blue';
			node.boundary.options.weight = 3;
		}
		else{
			node.boundary.options.color = 'black';
			node.boundary.options.weight = 1;

		}
		node.boundary.options.fillOpacity = 0.62;
		node.boundary.addTo(map);
		idx = idx + 1;
    }   
    updateLegend(scale)
    updateTimeSeries()
    updateHistogram()
}


function updateLegend(scale) {
    //
    let canvas = d3.select("#legendDiv");
    canvas.selectAll("div")
	.remove();

    if(scale == undefined)
	return;
    //
    let legendData = [];//[{ "color": "white", "label": "0" }];
    let values = scale.thresholds();
    let colors = scale.range();
    let formatter = d3.format(".2s");//d3.format(".3e");
    
    values.forEach((d, i) => {
	if(i == 0){
	    legendData.push({ "color": colors[i], "label": "<" + formatter(values[i])});
	}
	else{
	    legendData.push({ "color": colors[i], "label": "[" + formatter(values[i-1]) + "; " + formatter(values[i]) + "]" });
	}
    });
    legendData.push({ "color": colors[values.length], "label": formatter(values[values.length-1]) + ">" });
    legendData.reverse();


    let elements = canvas.selectAll("div")
	.data(legendData)
	.enter()
	.append("div")
	.selectAll("i")
	.data(d => [d])
	.enter();

    elements
	.append("i")
	.attr("style", d => "height: 10px; width: 10px; border: 2px solid black; margin: 4px; background: " + d.color)
	.text("___")
	elements
	.append("label")
	.text(d => d.label);


    //	 .attr("style",function(d){debugger});

    //update legend
    //;

    // loop through our density intervals and generate a label with a colored square for each interval
    // for (var i = 0; i < grades.length; i++) {
    //     div.innerHTML +=
    // 	'<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
    // 	grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    // }
}

function boundaryClicked(node) {
    //
    included = false
    for (i = 0; i < selected_nodes.length; i++){
    	if(selected_nodes[i].name == node.name){
    		included = true
    	}
   	}
	if (!included){ // add node to selected nodes
		selected_nodes.push(node)
	}
	else{ //remove node
		selected_nodes = selected_nodes.filter(node_selected => node_selected.name !== node.name)
	}
    updateBoundaries() 
    updateSelectedNodesDiv(node)
}

function updateSelectedNodesDiv(node){
	var p = d3.select("#selectedNbsDiv")
	.selectAll("p")
	.data(selected_nodes)
	.text(function(d) { return d.name})

	// Enter…
	p.enter().append("p").attr("style", "font-size: 11px; font-family: Arial Black;")
	    .text(function(d) { return d.name; });

	// Exit…
	p.exit().remove();

}

function loadInterface() {

  //
    let colorByOptions = [
			  { "value": "cases", "text": "Casos ativos" },
			  { "value": "casesPC", "text": "Casos ativos Per Capita" },
			  { "value": "sobre60", "text": "Prob. Sobrevivencia 60 anos" },
			  { "value": "rdpc", "text": "Renda per capta" },
			  { "text": "Ocupados no setor agropecuário", "value": "pagro" },
			  { "text": "Ocupados no setor comércio", "value": "pcom" },
			  { "text": "Ocupados no setor construção", "value": "pconstr" },
			  { "text": "Ocupados no setor extrativo", "value": "pextr" },
			  { "text": "Ocupados no setor serviços", "value": "pserv" },
			  { "text": "Ocupados no setor industrial", "value": "psiup" },
			  { "text": "Ocupados no setor ind. tranformação", "value": "ptransf" },
			  { "text": "Per. dom. vul. dependentes de idoso", "value": "prmaxidoso" },
			  { "text": "Pop. em dom. vul. com idoso", "value": "domvulneracomid" },
			  { "text": "Per da pop. em dom. com 2 pessoas por dormitório", "value": "tdens" },
			  { "text": "IDH", "value": "idhm" },
			  { "text": "IDH Educação", "value": "idhme" },
			  { "text": "IDH Longevidade", "value": "idhml" },
			  { "text": "IDH Renda", "value": "idhmr" },
			  { "text": "Abastecimento de água e esgotamento sanitário inadequados", "value": "water_supply" },
			  { "text": "Densidade demográfica", "value": "demo_dens" }];


    //////// map
    //check leaflet providers: http://leaflet-extras.github.io/leaflet-providers/preview/index.html
    map = L.map('map').setView([-8.043932398924108, -34.89995956420899], 12);

	var CartoDB_Positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
		subdomains: 'abcd',
		maxZoom: 19
	}).addTo(map);

    //
    layerBoundaries = L.geoJson(boundaries);
    for (let key in layerBoundaries._layers) {
	let item = layerBoundaries._layers[key]
	for (let key2 in nodes){
	    if(nodes[key2].bairro_codigo == item.feature.properties.bairro_codigo)
		nodes[key2].boundary = item;
	}
    }

    //
    for (let n in nodes) {
	let node = nodes[n];
	node.boundary.on("click", function () { boundaryClicked(node) });
    }

    //colorBy options
    var colorbymap = L.control({ position: 'topright' });
    colorbymap.onAdd = function (map) { 	
		var div = L.DomUtil.create('div', 'colorir por');
		div.setAttribute("id", "mapconfig_div");
		div.setAttribute("style", "padding: 10px; border: 1px solid black; background: white; width: 500px;  height: 40px; margin: 20px;")
		return div;
    };
    colorbymap.addTo(map);

	var calendar = d3.select("#mapconfig_div").append("div").attr("id","period_analysis")
	calendar.append("label").attr("for", "date1_map").text(" Data inicial: ")                  
	calendar.append("input").attr("id","date1_map").attr("type","date").attr("value", dates[0])
		.attr("max", dates[0]).attr("min",dates[dates.length - 1]).on("change", updateBoundaries);
	calendar.append("label").attr("for", "date2_map").text(" Data final: ")                  
	calendar.append("input").attr("id","date2_map").attr("type","date").attr("value", dates[0])
		.attr("max", dates[0]).attr("min",dates[dates.length - 1]).on("change", updateBoundaries);

    d3.select("#mapconfig_div").append("label").attr("for", "select_color").text(" Colorir por: ")
    .append("select").attr("id", "colorSelect") 
	.selectAll("option")
	.data(colorByOptions)
	.enter()
	.append("option")
	.attr("value", d => d.value)
	.text(d => d.text)
	d3.select("#colorSelect").on("change", function () {
	updateBoundaries();
    });


    // selected nodes box
    var selNbsDiv = L.control({ position: 'bottomleft' });
    selNbsDiv.onAdd = function (map) { 	
		var div = L.DomUtil.create('div', 'seleção atual');
		div.setAttribute("id", "selectedNbsDiv");
		div.setAttribute("style", "border: 1px solid black; background: white; width: 135px;  height: 210px; margin: 10px; overflow: auto;")
		return div;
    };
    selNbsDiv.addTo(map);

    //legend
    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function (map) { 	
		var div = L.DomUtil.create('div', 'info legend');
		div.setAttribute("id", "legendDiv");
		div.setAttribute("style", "border: 1px solid black; background: white; width: 135px;  height: 110px; margin: 10px;")
		return div;
    };
    legend.addTo(map);
    selected_nodes.push(nodes['VARZEA'])
    updateSelectedNodesDiv();
    drawGraph_TS();
    updateBoundaries();
    drawScatterPlot();
}

function buildCoords() {

    //
    dates = [];
    for (let i = 0; i < bairros[0].active_cases.length; ++i) {
	dates.push(bairros[0].active_cases[i][0]); 
    }
    dates = dates.reverse();
    currentDate = dates[0];

    d3.select("#dateSelect")
	.selectAll("option")
	.data(dates)
	.enter()
	.append("option")
	.attr("value", d => d)
	.text(d => d);

    d3.select("#dateSelect")
	.on("change", function () {
	    currentDate = this.selectedOptions[0].value;
	    updateDate();
	});


	var citiesToRemove = {
	    'Abreu e Lima': 1,
	    'Araçoiaba': 1,
	    'Cabo de Santo Agostinho': 1,
	    'Camaragibe': 1,
	    'Ilha de Itamaracá': 1,
	    'Itapissuma': 1,
	    'Jaboatão dos Guararapes': 1,
	    'Moreno': 1,
	    'Olinda': 1,
	    'Paulista': 1,
	    'São Lourenço da Mata': 1
	};
	bairros = bairros.filter(city => { return !(city.name in citiesToRemove) })

    //
    nodes = {};
    bairros.forEach(node => {
	//
	let cases = {};
	let estCases = {};
	let casesUTI = {};
	let cumDeaths = {};
	node.active_cases.forEach(x => {
	    cases[x[0]] = x[1];
	    estCases[x[0]] = x[1] / 0.2;
	});
	node.active_uti_cases.forEach(x => {
	    casesUTI[x[0]] = x[1];
	});
	node.cum_deaths.forEach(x => {
	    cumDeaths[x[0]] = x[1];
	});

	//
	nodes[node.name] = {
	    "group": 0,
	    "name": node.name,
	    "bairro_nome": node.name,
	    "bairro_codigo": node.bairro_codigo,
	    "population": node.population_2019,
	    "lat": node.lat,
	    "lng": node["long"],
	    "active_cases": cases[currentDate],
	    "active_cases_TS": cases,
	    'est_active_cases': estCases[currentDate],
	    "sobre60": node["SOBRE"]["SOBRE60"],
	    "rdpc": node["RDPC"].RDPC,
	    "rdpct": node["RDPCT"],
	    "pagro": node["P_AGRO"],
	    "pcom": node["P_COM"],
	    "pconstr": node["P_CONSTR"],
	    "pextr": node["P_EXTR"],
	    "pserv": node["P_SERV"],
	    "psiup": node["P_SIUP"],	
	    "ptransf": node["P_TRANSF"],
	    "prmaxidoso": node["T_RMAXIDOSO"],
	    "domvulneracomid": node["DOMVULNERACOMID"],
	    "tdens": node["T_DENS"],
	    "idhm": node["IDHM"],
	    "idhme": node["IDHM_E"],
	    "idhml": node["IDHM_L"],
	    "idhmr": node["IDHM_R"],
	    "water_supply": node.water_supply,
	    "demo_dens": node.demo_dens,
	    "samples_duration": node.duration_samples,
	    "active_uti_cases_TS": casesUTI,
	    "cum_deaths_TS": cumDeaths,
	    inEdges: {},
	    outEdges: {}
	};
	//
	totalPopulation += nodes[node.name].population;
    });

    //
    let listNodes = [];
    bairros.forEach(node => {
	listNodes.push(nodes[node.name]);
	let myNode = nodes[node.name];

    });

    //fix color scales
    ////
    casosConfirmadosColorScale.domain(d3.extent(listNodes, d => getIndicator(d, 'cases')));
    ////
    casosPCColorScale.domain(d3.extent(listNodes, d => getIndicator(d, 'casesPC')));

    //
    bairros.forEach(nn => {
	let node = nodes[nn.name];
	let coords = [node.lat, node.lng];
	var circle = L.circleMarker(coords, {
	    color: 'black',
	    weight: defaultStyle.weight,
	    fillColor: '#bebada',
	    fillOpacity: defaultStyle.fillOpacity,
	    radius: defaultStyle.radius
	});
	//
	//circle.options.clusterInfected = true; //???????
	//circle.options.infected        = (node.est_active_cases > 0);
	//suffix = (isInfected(node)?'Force of Infection: ' + node.forceOfInfection.toFixed(3):'Risk Exposure: ' + node.riskExposure.toFixed(3));
	circle.bindPopup('Name: ' + node.name + '</br>' + 'Active Cases: ' + node.active_cases + '</br>' + 'Estimated Active Cases: ' + node.est_active_cases);

	//
	nodeMarkers[node.name] = circle;
    });

    //
    let opacityScale = d3.scaleLinear().domain([0, 100]).range([0, 1]);
    for (let origin in nodes) {
	let node = nodes[origin];
	
	for (let destination in node.outEdges) {
	    let otherNode = nodes[destination];

	    if (origin != destination) {
		let weight = node.outEdges[destination];

		//create graphic representation
		let latlngs = [[node.lat, node.lng], [otherNode.lat, otherNode.lng]];
		let line = L.polyline(latlngs, { 'color': 'gray', 'weight': 10 * opacityScale(weight) + 1, 'value': weight, 'opacity': 0.1 });
		let decorator = L.polylineDecorator(line, {
		    patterns: [
			{ offset: '95%', repeat: 0, symbol: L.Symbol.arrowHead({ pixelSize: 12, polygon: true, pathOptions: { color: 'gray', stroke: true } }) }
		    ]
		});
		//
		line.decorator = decorator;
		lines[origin + "_" + destination] = line;
	    }

	}
    }
}


function drawGraph_TS(){
	var temp = d3.select("#graphTimeSeries")
	temp.select("div").remove()
	// dropdown menu time series
    let opts = [{ "text": "Casos Ativos", "value": "cases" },
		{ "text": "Casos Ativos per capita", "value": "casesPC" },
		{ "text": "Casos em UTI", "value": "uti" },
		{ "text": "Casos em UTI per capita", "value": "utiPC" },
		{ "text": "Mortos", "value": "deaths" },
		{ "text": "Mortos per capita", "value": "deathsPC" }];

	dates = Object.keys(selected_nodes[0].active_cases_TS)
	var calendar = d3.select("#graphTS").append("div").attr("id","period_analysis")
	calendar.append("label").attr("for", "date1_TS").text(" Data inicial: ")                  
	calendar.append("input").attr("id","date1_TS").attr("type","date").attr("value", dates[0])
		.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", updateTimeSeries);
	calendar.append("label").attr("for", "date2_TS").text(" Data final: ")                  
	calendar.append("input").attr("id","date2_TS").attr("type","date").attr("value", dates[dates.length - 1])
		.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", updateTimeSeries);


    var dropDownMenu = d3.select("#graphTS").append("div").attr("div","select_div")
    .append("label").attr("for", "ValueOption_TS").text(" Variável de interesse: ")
    .append("select").attr("id","ValueOption_TS").attr("name","ValueOption_TS").on("change", updateTimeSeries);
	dropDownMenu.selectAll("option")            
			.data(opts)
            .enter()
            .append("option")
            .attr("value",d=>d.value)
            .attr("selected",function(d,i){
		if(i == 0)
                    return "true";
		else
                    return null;
            })
            .text(d=>d.text)
	updateTimeSeries()
}

function updateTimeSeries(){
	selected_data_opt = d3.select("#ValueOption_TS").node().selectedOptions[0]
	date1 = d3.select("#date1_TS").node().value
	date2 = d3.select("#date2_TS").node().value
	//console.log(selected_data_opt.value)
	// dimensions for our svg and graph
    var margin = {top: 30, right: 30, bottom: 30, left: 50};
	var svgWidth = 860;
	var svgHeight = 500;
	var graphWidth = svgWidth - margin.left - margin.right;
	var graphHeight = svgHeight - margin.top - margin.bottom;
	// We write a function to parse the dates in our data, using the same directives we do in python’s strftime
	var parse_time = d3.timeFormat("%Y-%m-%d");
	// We’ll then define the ranges for our data that will be used to scale our data into the graph, for the x axis, this will be 0 to the graphWidth.
	// On our y axis, we are going the other way as we want our lower values to appear at the bottom of the graph, rather than the top.		
	var x = d3.scaleTime().range([0, graphWidth]);
	var y = d3.scaleLinear().range([graphHeight, 0]);
	// We can then define our axes, we’ll set a number of ticks but D3 will choose an appropriate value that is below the number of ticks we choose.
	var xAxis = d3.axisBottom(x).ticks(5);
	var yAxis = d3.axisLeft(y).ticks(5);
	
	//create our DATA = array of objects 
	dates = Object.keys(selected_nodes[0].active_cases_TS)
	data = []
	for (idx = 0; idx < dates.length; idx++){ // loop over all dates
		var row = {}
		if (dates[idx] >= date1 && dates[idx] <= date2){
			//console.log(dates[idx])
			row["Date"] = dates[idx]
			for (idx_bairro = 0; idx_bairro < selected_nodes.length; idx_bairro++){ // loop over all bairros
				if (selected_data_opt.value == 'cases'){
					row[selected_nodes[idx_bairro].name] = Object.values(selected_nodes[idx_bairro].active_cases_TS)[idx]
				}
				if (selected_data_opt.value == 'casesPC'){
					row[selected_nodes[idx_bairro].name] = Object.values(selected_nodes[idx_bairro].active_cases_TS)[idx]/selected_nodes[idx_bairro].population

				}
				if(selected_data_opt.value == 'uti'){
					row[selected_nodes[idx_bairro].name] = Object.values(selected_nodes[idx_bairro].active_uti_cases_TS)[idx]
				}
				if (selected_data_opt.value == 'utiPC'){
					row[selected_nodes[idx_bairro].name] = Object.values(selected_nodes[idx_bairro].active_uti_cases_TS)[idx]/selected_nodes[idx_bairro].population
				}
				if(selected_data_opt.value == 'deaths'){
					if (dates[idx] == dates[0]){row[selected_nodes[idx_bairro].name] = 0}
					else {
						row[selected_nodes[idx_bairro].name] = Object.values(selected_nodes[idx_bairro].cum_deaths_TS)[idx] - Object.values(selected_nodes[idx_bairro].cum_deaths_TS)[idx-1]
					}
				}
				if (selected_data_opt.value == 'deathsPC'){
					if (dates[idx] == dates[0]){row[selected_nodes[idx_bairro].name] = 0}
					else {
						row[selected_nodes[idx_bairro].name] = (Object.values(selected_nodes[idx_bairro].cum_deaths_TS)[idx] - Object.values(selected_nodes[idx_bairro].cum_deaths_TS)[idx-1])/selected_nodes[idx_bairro].population
					}	
				}
			}
			data.push(row);
		}
	}

	// clean svg
	var temp = d3.select("#graphTS")
	temp.select("svg").remove()


	var svg = d3.select("#graphTS")
	.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
    .append("g")
        .attr("transform", 
        "translate(" + margin.left + "," + margin.top + ")")

        
	// For each row in the data, parse the date
	// and use + to make sure data is numerical
	y_min = 10000000
	y_max = -10000000
	data.forEach(function(d) {
		d.Date = new Date(d.Date);
		for (bairro in d){
			if(bairro != 'Date'){
				d[bairro] = +d[bairro]
				if (d[bairro] < y_min){
					y_min = d[bairro]
				}
				if (d[bairro] > y_max){
					y_max = d[bairro]
				}
			}
		}

	});
	
	// Scale the range of the data
	x.domain(d3.extent(data, function(d) { return d.Date; }));
	y.domain([y_min, y_max]);

	/*
	var colors = d3.scaleQuantize()
    .domain([0,selected_nodes.length])
    .range(
	["#2b1c33","#39255f","#3b2768","#3e2a72","#402c7b","#422f83","#44318b","#453493","#46369b","#4839a2","#2f1e3f","#32204a","#362354","#493ca8","#493eaf","#4a41b5","#4a44bb","#4b46c0","#4b49c5","#4b4cca","#4b4ecf","#4b51d3","#4a54d7","#4a56db","#4959de","#495ce2","#485fe5","#4761e7","#4664ea","#4567ec","#446aee","#446df0","#426ff2","#4172f3","#4075f5","#3f78f6","#3e7af7","#3d7df7","#3c80f8","#3a83f9","#3985f9","#3888f9","#378bf9","#368df9","#3590f8","#3393f8","#3295f7","#3198f7","#309bf6","#2f9df5","#2ea0f4","#2da2f3","#2ca5f1","#2ba7f0","#2aaaef","#2aaced","#29afec","#28b1ea","#28b4e8","#27b6e6","#27b8e5","#26bbe3","#26bde1","#26bfdf","#25c1dc","#25c3da","#25c6d8","#25c8d6","#25cad3","#25ccd1","#25cecf","#26d0cc","#26d2ca","#26d4c8","#27d6c5","#27d8c3","#28d9c0","#29dbbe","#29ddbb","#2adfb8","#2be0b6","#2ce2b3","#2de3b1","#2ee5ae","#30e6ac","#31e8a9","#32e9a6","#34eba4","#35eca1","#37ed9f","#39ef9c","#3af09a","#3cf197","#3ef295","#40f392","#42f490","#44f58d","#46f68b","#48f788","#4af786","#4df884","#4ff981","#51fa7f","#54fa7d","#56fb7a","#59fb78","#5cfc76","#5efc74","#61fd71","#64fd6f","#66fd6d","#69fd6b","#6cfd69","#6ffe67","#72fe65","#75fe63","#78fe61","#7bfe5f","#7efd5d","#81fd5c","#84fd5a","#87fd58","#8afc56","#8dfc55","#90fb53","#93fb51","#96fa50","#99fa4e","#9cf94d","#9ff84b","#a2f84a","#a6f748","#a9f647","#acf546","#aff444","#b2f343","#b5f242","#b8f141","#bbf03f","#beef3e","#c1ed3d","#c3ec3c","#c6eb3b","#c9e93a","#cce839","#cfe738","#d1e537","#d4e336","#d7e235","#d9e034","#dcdf33","#dedd32","#e0db32","#e3d931","#e5d730","#e7d52f","#e9d42f","#ecd22e","#eed02d","#f0ce2c","#f1cb2c","#f3c92b","#f5c72b","#f7c52a","#f8c329","#fac029","#fbbe28","#fdbc28","#feb927","#ffb727","#ffb526","#ffb226","#ffb025","#ffad25","#ffab24","#ffa824","#ffa623","#ffa323","#ffa022","#ff9e22","#ff9b21","#ff9921","#ff9621","#ff9320","#ff9020","#ff8e1f","#ff8b1f","#ff881e","#ff851e","#ff831d","#ff801d","#ff7d1d","#ff7a1c","#ff781c","#ff751b","#ff721b","#ff6f1a","#fd6c1a","#fc6a19","#fa6719","#f96418","#f76118","#f65f18","#f45c17","#f25916","#f05716","#ee5415","#ec5115","#ea4f14","#e84c14","#e64913","#e44713","#e24412","#df4212","#dd3f11","#da3d10","#d83a10","#d5380f","#d3360f","#d0330e","#ce310d","#cb2f0d","#c92d0c","#c62a0b","#c3280b","#c1260a","#be2409","#bb2309","#b92108","#b61f07","#b41d07","#b11b06","#af1a05","#ac1805","#aa1704","#a81604","#a51403","#a31302","#a11202","#9f1101","#9d1000","#9b0f00","#9a0e00","#980e00","#960d00","#950c00","#940c00","#930c00","#920c00","#910b00","#910c00","#900c00","#900c00","#900c00"]
	);
	*/
	// Add the highLine as a green line
	var indx_clr = 0
	for (bairro in data[0]){
		if(bairro != 'Date'){
			var bairro_line = d3.line()
    			.x(function(d) { return x(d.Date); })
    			.y(function(d) { return y(d[bairro]); });
			svg.append("path")
			.style("stroke", nodes[bairro].boundary.options.fillColor)
			.style("stroke-width", 3)
			.style("fill", "none")
			.attr("class", "line")
			.attr("opacity", 1)
			.attr("id",bairro)
			.on("mouseover", handleMouseOverTS)
            .on("mouseout", handleMouseOutTS)
			.attr("d", bairro_line(data));
		}
		indx_clr = indx_clr + 1
	}

	// Add the X Axis
	svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + graphHeight + ")")
	  .call(xAxis);
	// Add the Y Axis
	svg.append("g")
	.attr("class", "y axis")
	.call(yAxis);
	// Add the text 
	var indx_clr = 0
	for (bairro in data[0]){
		if(bairro != 'Date'){
			svg.append("text")
			.attr("transform", "translate("+(-50)+","+y(data[0][bairro])+")")
			.attr("dy", ".35em")
			.attr("opacity",0)
			.attr("text-anchor", "start")
			.attr("id",bairro.replace(' ','') + "text")
			.style("font", "bold 10px Arial Black")
			.style("fill", "solid black")
			.text(bairro);
		}
		indx_clr = indx_clr + 1
	}
}

// Create Event Handlers for mouse
function handleMouseOverTS(d, i) {  // Add interactivity


	svg = d3.select("#graphTS")
	svg.selectAll('path').attr("opacity", .2)
    // Use D3 to select element, change color and size
   	d3.select(this).attr("opacity", 1);
   	svg.select("#" + this.id.replace(' ','')  + "text").attr("opacity",1)

/*
    // Specify where to put label of text
    svg.append("text").attr({
       id: "t" + d.x + "-" + d.y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
        x: function() { return xScale(d.x) - 30; },
        y: function() { return yScale(d.y) - 15; }
    })
    .text(function() {
      return [d.x, d.y];  // Value of the text
    });*/
}

function handleMouseOutTS(d, i){

	svg = d3.select("#graphTS")
	svg.selectAll('path').attr("opacity", 1)
   	svg.select("#" +  this.id.replace(' ','')  + "text").attr("opacity",0)
    // Use D3 to select element, change color back to normal
    //d3.select(this).attr({
     // fill: "black",
     // r: radius
    //});

    // Select text by id and then remove
    //d3.select("#t" + d.x + "-" + d.y + "-" + i).remove();  // Remove text location
}


function drawScatterPlot(){
	var temp = d3.select("#graphScatter")
	temp.select("div").remove()
	scatterplot_notloaded = false
	// dropdown menu - epidem time series
    let opts_y_axis = [{ "text": "Casos Ativos", "value": "cases" },
		{ "text": "Casos Ativos per capita", "value": "casesPC"},
		{ "text": "Casos em UTI", "value": "uti" },
		{ "text": "Casos em UTI per capita", "value": "utiPC" },
		{ "text": "Mortos", "value": "deaths" },
		{ "text": "Mortos per capita", "value": "deathsPC" }];
	// dropdown menu - districts characteristics
    let opts_x_axis = [
		{ "value": "sobre60", "text": "Prob. Sobrevivencia 60 anos" },
		  { "value": "rdpc", "text": "Renda per capta" },
		  { "text": "Ocupados no setor agropecuário", "value": "pagro" },
		  { "text": "Ocupados no setor comércio", "value": "pcom" },
		  { "text": "Ocupados no setor construção", "value": "pconstr" },
		  { "text": "Ocupados no setor extrativo", "value": "pextr" },
		  { "text": "Ocupados no setor serviços", "value": "pserv" },
		  { "text": "Ocupados no setor industrial", "value": "psiup" },
		  { "text": "Ocupados no setor ind. tranformação", "value": "ptransf" },
		  { "text": "Per. dom. vul. dependentes de idoso", "value": "prmaxidoso" },
		  { "text": "Pop. em dom. vul. com idoso", "value": "domvulneracomid" },
		  { "text": "Per da pop. em dom. com 2 pessoas por dormitório", "value": "tdens" },
		  { "text": "IDH", "value": "idhm" },
		  { "text": "IDH Educação", "value": "idhme" },
		  { "text": "IDH Longevidade", "value": "idhml" },
		  { "text": "IDH Renda", "value": "idhmr" },
		  { "text": "Suprimento de água e esgotamento sanitário inadequados", "value": "water_supply" },
		  { "text": "Densidade demográfica", "value": "demo_dens" }];

	dates = Object.keys(selected_nodes[0].active_cases_TS)
	var calendar = d3.select("#graphScatter").append("div").attr("id","period_analysis_scatter")
	calendar.append("label").attr("for", "date1_scatter").text(" Data inicial: ")                  
	calendar.append("input").attr("id","date1_scatter").attr("type","date").attr("value", dates[0])
		.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", updateScatterPlot);
	calendar.append("label").attr("for", "date2_scatter").text(" Data final: ")                  
	calendar.append("input").attr("id","date2_scatter").attr("type","date").attr("value", dates[dates.length - 1])
		.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", updateScatterPlot);

	// add select 1 - epidem variables
    var dropDownMenu = d3.select("#graphScatter").select("div").append("div")
    	.append("label").attr("for", "ValueOption_1").text(" Y: ")
    	.append("select")
		.attr("id","ValueOption_1").attr("style", "font-size: 13px;").attr("name","ValueOption_epidem").on("change", updateScatterPlot);
	d3.select("#ValueOption_1").selectAll("option")            
			.data(opts_y_axis)
            .enter()
            .append("option")
            .attr("value",d=>d.value)
            .attr("selected",function(d,i){
		if(i == 0)
                    return "true";
		else
                    return null;
            })
            .text(d=>d.text)

    // add select 2 - district variables
    var dropDownMenu = d3.select("#graphScatter").select("div").select("div")
	dropDownMenu.append("label").attr("for", "ValueOption_2").text("   X: ")
	.append("select").attr("id","ValueOption_2").attr("style", "font-size: 13px;").attr("name","ValueOption_neighborhood").on("change", updateScatterPlot);
	d3.select("#ValueOption_2").selectAll("option")             
			.data(opts_x_axis)
            .enter()
            .append("option")
            .attr("value",d=>d.value)
            .attr("selected",function(d,i){
		if(i == 0)
                    return "true";
		else
                    return null;
            })
            .text(d=>d.text)
	updateScatterPlot()
}

function updateScatterPlot(){
	selected_data_opt_y = d3.select("#ValueOption_1").node().selectedOptions[0]
	selected_data_opt_x = d3.select("#ValueOption_2").node().selectedOptions[0]
	date1 = d3.select("#date1_scatter").node().value
	date2 = d3.select("#date2_scatter").node().value
	//console.log(selected_data_opt.value)
	// dimensions for our svg and graph
    var margin = {top: 30, right: 50, bottom: 30, left: 50};
	var svgWidth = 600;
	var svgHeight = 500;
	var graphWidth = svgWidth - margin.left - margin.right;
	var graphHeight = svgHeight - margin.top - margin.bottom;
	// We write a function to parse the dates in our data, using the same directives we do in python’s strftime
	
	//create our DATA = array of objects 
	dates = Object.keys(nodes["AFLITOS"].active_cases_TS)
	data_x_axis = [] // district characteristics
	data_y_axis = [] // epidem TS

	for (let name in nodes){ // loop over all bairros
		let node = nodes[name]
		if (selected_data_opt_x.value  == 'sobre60'){ data_x_axis.push(node.sobre60.mean)}
		if (selected_data_opt_x.value  == 'rdpc'){ data_x_axis.push(node.rdpc.mean)}
		if (selected_data_opt_x.value  == 'pagro'){ data_x_axis.push(node.pagro.mean)}
		if (selected_data_opt_x.value  == 'pcom'){ data_x_axis.push(node.pcom.mean)}
		if (selected_data_opt_x.value  == 'pconstr'){ data_x_axis.push(node.pconstr.mean)}
		if (selected_data_opt_x.value  == 'pextr'){ data_x_axis.push(node.pextr.mean)}
		if (selected_data_opt_x.value  == 'pserv'){ data_x_axis.push(node.pserv.mean)}
		if (selected_data_opt_x.value  == 'psiup'){ data_x_axis.push(node.psiup.mean)}
		if (selected_data_opt_x.value  == 'ptransf'){ data_x_axis.push(node.ptransf.mean)}
		if (selected_data_opt_x.value  == 'prmaxidoso'){ data_x_axis.push(node.prmaxidoso.mean)}
		if (selected_data_opt_x.value  == 'domvulneracomid'){ data_x_axis.push(node.domvulneracomid.mean)}
		if (selected_data_opt_x.value  == 'tdens'){ data_x_axis.push(node.tdens.mean)}
		if (selected_data_opt_x.value  == 'idhm'){ data_x_axis.push(node.idhm.mean)}
		if (selected_data_opt_x.value  == 'idhme'){ data_x_axis.push(node.idhme.mean)}
		if (selected_data_opt_x.value  == 'idhml'){ data_x_axis.push(node.idhml.mean)}
		if (selected_data_opt_x.value  == 'idhmr'){ data_x_axis.push(node.idhmr.mean)}
		if (selected_data_opt_x.value  == 'water_supply'){ data_x_axis.push(node.water_supply)}
		if (selected_data_opt_x.value  == 'demo_dens'){ data_x_axis.push(node.demo_dens)}

		// get avg, max, min values
		let val_y = 0
		let date_counter = 0
		for (idx = 0; idx < dates.length; idx++){ // loop over all selected dates
			if (dates[idx] >= date1 && dates[idx] <= date2){
				if (selected_data_opt_y.value == 'cases'){
					val_y += Object.values(node.active_cases_TS)[idx]
				}
				if (selected_data_opt_y.value == 'casesPC'){
					val_y += Object.values(node.active_cases_TS)[idx]/node.population
				}
				if (selected_data_opt_y.value == 'uti'){
					val_y += Object.values(node.active_uti_cases_TS)[idx]
				}
				if (selected_data_opt_y.value == 'utiPC'){
					val_y += Object.values(node.active_uti_cases_TS)[idx]/node.population
				}
				if(selected_data_opt_y.value == 'deaths'){
					if (dates[idx] == dates[0]){val_y += 0}
					else {
						val_y += Object.values(node.cum_deaths_TS)[idx] - Object.values(node.cum_deaths_TS)[idx-1]
					}
				}
				if (selected_data_opt_y.value == 'deathsPC'){
					if (dates[idx] == dates[0]){val_y += 0}
					else {
						val_y += (Object.values(node.cum_deaths_TS)[idx] - Object.values(node.cum_deaths_TS)[idx-1])/node.population
					}	
				}
				date_counter += 1;
			}
		}
		val_y = val_y/date_counter
		data_y_axis.push(val_y)
	}

	// clean svg
	var temp = d3.select("#graphScatter")
	temp.select("svg").remove()


	var svg = d3.select("#graphScatter")
	.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
    .append("g")
        .attr("transform", 
        "translate(" + margin.left + "," + margin.top + ")")

	// Add X axis
	var x = d3.scaleLinear()
	.domain(d3.extent(data_x_axis))
	.range([0, graphWidth]);
	svg.append("g")
	.attr("transform", "translate(0," + graphHeight + ")")
	.call(d3.axisBottom(x));

	// Add Y axis
	var y = d3.scaleLinear()
	.domain(d3.extent(data_y_axis))
	.range([graphHeight, 0]);
	svg.append("g")
	.call(d3.axisLeft(y));

 	// Add dots
 	data = []
 	idx = 0
 	for (let name in nodes){
 		row = {}
 		row['x'] = data_x_axis[idx]
 		row['y'] = data_y_axis[idx]  
 		row['name'] = name
 		idx = idx + 1;
 		data.push(row)
 	}
	svg.append('g')
	.selectAll("dot")
	.data(data)
	.enter()
	.append("circle")
	  .attr("cx", function (d) { return x(d.x); } )
	  .attr("cy", function (d) { return y(d.y); } )
	  .attr("r", 4.5)
	  .attr("name", function (d) {return d.name;})
	  .on("click", onMouseClickScatter)
	  .on("mouseover", onMouseOverScatter)
	  .on("mouseout", onMouseOutScatter)
	  .style("fill", "#69b3a2")
}

function onMouseClickScatter(d, i){
	//console.log(d3.select(this).attr("name"))
	boundaryClicked(nodes[d3.select(this).attr("name")])
}

function onMouseOverScatter(d, i){
	//console.log(d3.select(this).attr("name"))
	d3.select(this).attr("r",8)

}

function onMouseOutScatter(d, i){
	//console.log(d3.select(this).attr("name"))
	d3.select(this).attr("r",4.5)
}

function updateHistogram(){
	var temp = d3.select("#graphHist")
	temp.select("svg").remove()

	// set the dimensions and margins of the graph
    var margin = {top: 30, right: 50, bottom: 30, left: 50};
	var svgWidth = 600;
	var svgHeight = 500;
	var graphWidth = svgWidth - margin.left - margin.right;
	var graphHeight = svgHeight - margin.top - margin.bottom;

	// append the svg object to the body of the page
	var svg = d3.select("#graphHist")
	.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
    .append("g")
        .attr("transform", 
        "translate(" + margin.left + "," + margin.top + ")")


	let datac = {} //  key: color, value: sample vector
	let totalData = []
	for (idx_bairro = 0; idx_bairro < selected_nodes.length; idx_bairro++){ // loop over all bairros
		// detect category by color...
		cat = selected_nodes[idx_bairro].boundary.options.fillColor
		if(!datac.hasOwnProperty(cat)){
			datac[cat] = []
		}
		//for (idx_d = 0; idx_d < selected_nodes[idx_bairro].samples_duration.length; idx_d ++){
		//	row = {}
		//	row["value"] = selected_nodes[idx_bairro].samples_duration[idx_d]
		//	data[cat].push(row)
		//}
		datac[cat] = datac[cat].concat(selected_nodes[idx_bairro].samples_duration)
		totalData = totalData.concat(selected_nodes[idx_bairro].samples_duration)
	}
	// set the parameters for the histogram
		// X axis: scale and draw:
	var x = d3.scaleLinear()
	  .domain(d3.extent(totalData))     // can use this instead of 1000 to have the max of data: d3.max(data, function(d) { return +d.price })
	  .range([0, graphWidth]);
	svg.append("g")
	  .attr("transform", "translate(0," + graphHeight + ")")
	  .call(d3.axisBottom(x));
	var histogram = d3.histogram()
	  .value(function(d) { return +d; })   // I need to give the vector of value
	  .domain(x.domain())  // then the domain of the graphic
	  .thresholds(x.ticks(40)); // then the numbers of bins

	// And apply the histogram function to data to get the bins.
	bins = {}
	lenght_all = []
	for (cat in datac){
		bins[cat] =  histogram(datac[cat]);
		lenght_all.push(datac[cat].length);
	}


	// Y axis: scale and draw:
	var y = d3.scaleLinear()
	  .range([graphHeight, 0]);
	y.domain([0, 150]);   // d3.hist has to be called before the Y axis obviously
	svg.append("g")
	  .call(d3.axisLeft(y));

	rect_idx = 1
	for (cat in bins){
		// append the bars for this cat
		 svg.selectAll("rect" + String(rect_idx))
	      .data(bins[cat])
	      .enter()
	      .append("rect")
	        .attr("x", 1)
	        .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
	        .attr("width", function(d) { return x(d.x1) - x(d.x0)  ; })
	        .attr("height", function(d) { return graphHeight - y(d.length); })
	        .style("fill", cat)
	        .style("opacity", 0.6)
	     rect_idx += 1
	}

	cy_val = 30
	currIdx = 0
	for (cat in bins){
		// Handmade legend
		svg.append("circle").attr("cx",350).attr("cy",cy_val).attr("r", 6).style("fill", cat)
		svg.append("text").attr("x", 370).attr("y", cy_val).text("num. de amostras: " + String(datac[cat].length)).style("font-size", "15px").attr("alignment-baseline","middle")
		cy_val += 30;
		currIdx += 1;
	}

}

//
buildCoords();


//
loadInterface();
