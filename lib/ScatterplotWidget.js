class ScatterplotWidget{

    constructor(container,options,id,optionChangedCallback){
	this.container = container;
	this.options = options;
	this.id = id;
	this.optionChangedCallback = optionChangedCallback;
	this.init();
    }

    init(){
	//
	let parentWidth  = this.container.node().parentElement.clientWidth;
	let parentHeight = this.container.node().parentElement.clientHeight;
	//
	let valueColumns = this.options;
	let myDiv = this.container;
	// x Axis
	let controlsDiv = myDiv.append('div');
	controlsDiv.append("label").text("Dim 1: ");
	let menus = [];

	//
	let dropDownMenuX = controlsDiv.append("select")
	    .attr("id",this.id + "optionX").attr("name",this.id + "ValueOption");
	dropDownMenuX.selectAll("option")
            .data(valueColumns)
            .enter()
            .append("option")
            .attr("value",d=>d.value)
            .attr("selected",function(d,i){
		if(i == 0)
                    return "true";
		else
                    return null;
            })
            .text(d=>d.text);
	menus.push(dropDownMenuX);
	controlsDiv.append("br");
	// y Axis
	controlsDiv.append("label").text("Dim 2: ");
	let dropDownMenu = controlsDiv.append("select")
	    .attr("id",this.id + "optionY").attr("name",this.id + "ValueOption");
	dropDownMenu.selectAll("option")
            .data(valueColumns)
            .enter()
            .append("option")
            .attr("value",d=>d.value)
            .attr("selected",function(d,i){
		if(i == 1)
                    return "true";
		else
                    return null;
            })
            .text(d=>d.text);
	menus.push(dropDownMenu);

	controlsDiv.append("br");
	controlsDiv.append("br");

	//
	let that = this;
	let callback = function(){
	    let xaxis = d3.select("#" + that.id + "optionX");
	    let yaxis = d3.select("#" + that.id + "optionY");
	    that.optionChangedCallback(
		[xaxis.node().selectedOptions[0].value,yaxis.node().selectedOptions[0].value,
		 xaxis.node().selectedOptions[0].text,yaxis.node().selectedOptions[0].text]);
	}
    
	menus.forEach(menu=>{
	    menu.on("change",callback);
	});
	
	//
	let svg = myDiv.append('svg').attr('width',parentWidth).attr('height',parentHeight/3+80);
	this.chart = new Scatterplot(svg,"scatChart",0,0,parentWidth,parentHeight/3+40);
    }

    update(){
	let xaxis = d3.select("#" + this.id + "optionX");
	let yaxis = d3.select("#" + this.id + "optionY");
	this.optionChangedCallback(
	    [xaxis.node().selectedOptions[0].value,yaxis.node().selectedOptions[0].value,
	     xaxis.node().selectedOptions[0].text,yaxis.node().selectedOptions[0].text]);
    }

    getSelectedOptionX(){
	return d3.select('#' + this.id + "optionX").node().selectedOptions[0].value;
    }

    getSelectedOptionY(){
	return d3.select('#' + this.id + "optionY").node().selectedOptions[0].value;
    }

    setXAxisLabel(xLabel){
	this.chart.setXAxisLabel(xLabel);
    }
    
    setYAxisLabel(yLabel){
	this.chart.setYAxisLabel(yLabel);
    }
    
    setData(dt){
	this.chart.setData(dt);
	}
	
	setSelected(){

	}

    setSelectionCallback(f){
	this.chart.setSelectionCallback(f);
	}
	
	setSelected(id){
		this.chart.setSelected(id);
	}
}
