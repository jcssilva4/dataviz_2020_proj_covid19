class TSChartWidget{
	
    constructor(container,selected_nodes){
		this.container = container;
		this.opts = [{ "text": "Casos Ativos", "value": "cases" },
					{ "text": "Casos Ativos per capita", "value": "casesPC" },
					{ "text": "Casos em UTI", "value": "uti" },
					{ "text": "Casos em UTI per capita", "value": "utiPC" },
					{ "text": "Mortos", "value": "deaths" },
					{ "text": "Mortos per capita", "value": "deathsPC" }];
		// initialize
		this.init();
    }

    init(){
		this.container.select("div").remove()
		dates = Object.keys(selected_nodes[0].active_cases_TS)

		let _self = this

		//calendar
		let calendar = this.container.append("div").attr("id","period_analysis")
		calendar.append("label").attr("for", "date1_TS").text(" Data inicial: ").attr("style","font-size: 11px;")                  
		calendar.append("input").attr("id","date1_TS").attr("style","font-size: 11px;").attr("type","date").attr("value", dates[0])
			.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", function(d,i){ _self.updateTimeSeries()});
		calendar.append("label").attr("for", "date2_TS").text(" Data final: ").attr("style","font-size: 11px;")                  
		calendar.append("input").attr("id","date2_TS").attr("style","font-size: 11px;").attr("type","date").attr("value", dates[dates.length - 1])
			.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", function(d,i){ _self.updateTimeSeries()});

		// dropdown menu time series
	    let dropDownMenu = this.container.append("div").attr("div","select_div")
	    .append("label").attr("for", "ValueOption_TS").text(" Variável de interesse: ").attr("style","font-size: 11px;")
	    .append("select").attr("style","font-size: 11px;").attr("id","ValueOption_TS").attr("name","ValueOption_TS").on("change", function(d,i){ _self.updateTimeSeries()});
		dropDownMenu.selectAll("option")            
				.data(this.opts)
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
		this.updateTimeSeries()
	}

	updateTimeSeries(){
		let selected_data_opt = d3.select("#ValueOption_TS").node().selectedOptions[0]
		let date1 = d3.select("#date1_TS").node().value
		let date2 = d3.select("#date2_TS").node().value
		//console.log(selected_data_opt.value)
		// dimensions for our svg and graph
	    var margin = {top: 20, right: 20, bottom: 20, left: 60};
		var svgWidth = 670;
		var svgHeight = 260;
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
		let dates = Object.keys(selected_nodes[0].active_cases_TS)
		let data = []
		for (let idx = 0; idx < dates.length; idx++){ // loop over all dates
			var row = {}
			if (dates[idx] >= date1 && dates[idx] <= date2){
				//console.log(dates[idx])
				row["Date"] = dates[idx]
				for (let idx_bairro = 0; idx_bairro < selected_nodes.length; idx_bairro++){ // loop over all bairros
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
		let temp = this.container
		temp.select("svg").remove()

		let svg = this.container
		.append("svg")
	        .attr("width", svgWidth)
	        .attr("height", svgHeight)
	    .append("g")
	        .attr("transform", 
	        "translate(" + margin.left + "," + margin.top + ")")

	        
		// For each row in the data, parse the date
		// and use + to make sure data is numerical
		let y_min = 10000000
		let y_max = -10000000
		data.forEach(function(d) {
			d.Date = new Date(d.Date);
			for (let bairro in d){
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
		let _self = this // we cannot use this.container in event handler functions, since in this kind of function 'this' referes to the element that called the function, not the class anymore
		var indx_clr = 0
		for (let bairro in data[0]){
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
				.on("mouseover", function(d,i){ _self.handleMouseOverTS(this, d, i); }) // in this anom function -> 'this' refers to the dom_element and '_self' refers to the class
	            .on("mouseout",  function(d,i){ _self.handleMouseOutTS(this, d, i); })
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
		for (let bairro in data[0]){
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

	handleMouseOverTS(dom_el, d, i) {  // Add interactivity
		let svg = this.container
		svg.selectAll('path').attr("opacity", .2)
	    // Use D3 to select element, change color and size
	   	d3.select(dom_el).attr("opacity", 1);
	   	svg.select("#" + dom_el.id.replace(' ','')  + "text").attr("opacity",1)

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

	handleMouseOutTS(dom_el, d, i){
		let svg = this.container
		svg.selectAll('path').attr("opacity", 1)
	   	svg.select("#" +  dom_el.id.replace(' ','')  + "text").attr("opacity",0)
	    // Use D3 to select element, change color back to normal
	    //d3.select(this).attr({
	     // fill: "black",
	     // r: radius
	    //});

	    // Select text by id and then remove
	    //d3.select("#t" + d.x + "-" + d.y + "-" + i).remove();  // Remove text location
	}
}
