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

///////////// MAP


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
    graphTS.updateTimeSeries(selected_nodes)
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
    graphTS = new TSChartWidget(d3.select("#graphTS"), selected_nodes)
    updateBoundaries();
    graphSct = new ScatterWidget(d3.select("#graphScatter"))
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

function updateHistogram(){
	var temp = d3.select("#graphHist")
	temp.select("svg").remove()

	// set the dimensions and margins of the graph
    var margin = {top: 20, right: 50, bottom: 20, left: 25};
	var svgWidth = 300;
	var svgHeight = 300;
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

	cy_val = 0
	currIdx = 0
	for (cat in bins){
		// Handmade legend
		svg.append("circle").attr("cx",135).attr("cy",cy_val).attr("r", 4).style("fill", cat)
		svg.append("text").attr("x", 145).attr("y", cy_val).text("num. de amostras: " + String(datac[cat].length)).style("font-size", "11px").attr("alignment-baseline","middle")
		cy_val += 30;
		currIdx += 1;
	}

}

//
buildCoords();


//
loadInterface();
