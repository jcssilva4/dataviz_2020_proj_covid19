class ScatterWidget{
	
    constructor(container){
		this.container = container;
		// dropdown menu - epidem time series
		this.opts_y_axis = [{ "text": "Casos Ativos", "value": "cases" },
			{ "text": "Casos Ativos per capita", "value": "casesPC"},
			{ "text": "Casos em UTI", "value": "uti" },
			{ "text": "Casos em UTI per capita", "value": "utiPC" },
			{ "text": "Mortos", "value": "deaths" },
			{ "text": "Mortos per capita", "value": "deathsPC" }];
		// dropdown menu - districts characteristics
		this.opts_x_axis = [
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
		// initialize
		this.init();
    }

    init(){

	    var temp = this.container
		temp.select("div").remove()

		dates = Object.keys(selected_nodes[0].active_cases_TS) 
		var calendar = this.container.append("div").attr("id","period_analysis_scatter")
		calendar.append("label").attr("for", "date1_scatter").text(" Data inicial: ").attr("style","font-size: 10px;")               
		calendar.append("input").attr("id","date1_scatter").attr("style","font-size: 10px;").attr("type","date").attr("value", dates[0])
			.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", this.updateScatterPlot);
		calendar.append("label").attr("for", "date2_scatter").text(" Data final: ").attr("style","font-size: 10px;")                  
		calendar.append("input").attr("id","date2_scatter").attr("style","font-size: 10px;").attr("type","date").attr("value", dates[dates.length - 1])
			.attr("max", dates[dates.length - 1]).attr("min",dates[0]).on("change", this.updateScatterPlot);

		// add select 1 - epidem variables
	    var dropDownMenu = this.container.select("div").append("div")
	    	.append("label").attr("for", "ValueOption_1").attr("style","font-size: 10px;").text(" Y: ")
	    	.append("select")
			.attr("id","ValueOption_1").attr("style", "font-size: 10px;").attr("name","ValueOption_epidem").on("change", this.updateScatterPlot);
		d3.select("#ValueOption_1").selectAll("option")            
				.data(this.opts_y_axis)
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
	    var dropDownMenu = this.container.select("div").select("div")
		dropDownMenu.append("label").attr("for", "ValueOption_2").attr("style","font-size: 10px;").text("   X: ")
		.append("select").attr("id","ValueOption_2").attr("style", "font-size: 10px;").attr("name","ValueOption_neighborhood").on("change", this.updateScatterPlot);
		d3.select("#ValueOption_2").selectAll("option")             
				.data(this.opts_x_axis)
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
		this.updateScatterPlot()
	}

	updateScatterPlot(){
		let selected_data_opt_y = d3.select("#ValueOption_1").node().selectedOptions[0]
		let selected_data_opt_x = d3.select("#ValueOption_2").node().selectedOptions[0]
		let date1 = d3.select("#date1_scatter").node().value
		let date2 = d3.select("#date2_scatter").node().value
		//console.log(selected_data_opt.value)
		// dimensions for our svg and graph
	    var margin = {top: 20, right: 2, bottom: 20, left: 20};
		var svgWidth = 330;
		var svgHeight = 300;
		var graphWidth = svgWidth - margin.left - margin.right;
		var graphHeight = svgHeight - margin.top - margin.bottom;
		// We write a function to parse the dates in our data, using the same directives we do in python’s strftime
		
		//create our DATA = array of objects 
		let dates = Object.keys(nodes["AFLITOS"].active_cases_TS)
		let data_x_axis = [] // district characteristics
		let data_y_axis = [] // epidem TS

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
			for (let idx = 0; idx < dates.length; idx++){ // loop over all selected dates
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
		var temp = this.container
		temp.select("svg").remove()


		var svg = this.container
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
	 	let data = []
	 	let idx = 0
	 	for (let name in nodes){
	 		let row = {}
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
		  .on("click", this.onMouseClickScatter)
		  .on("mouseover", this.onMouseOverScatter)
		  .on("mouseout", this.onMouseOutScatter)
		  .style("fill", "#69b3a2")

	}

	onMouseClickScatter(d, i){
		//console.log(d3.select(this).attr("name"))
		boundaryClicked(nodes[d3.select(this).attr("name")])
	}

	onMouseOverScatter(d, i){
		//console.log(d3.select(this).attr("name"))
		d3.select(this).attr("r",8)

	}

	onMouseOutScatter(d, i){
		//console.log(d3.select(this).attr("name"))
		d3.select(this).attr("r",4.5)
	}
}