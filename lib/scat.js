class Scatterplot {
	constructor(container, widgetID, screenX, screenY, totalWidth, totalHeight) {
		this.renderingArea =
		{
			x: screenX, y: screenY,
			width: totalWidth, height: totalHeight
		};
		this.margins = {
			left: 65, right: 15,
			top: 5, bottom: 5
		};
		this.canvasWidth = this.renderingArea.width - this.margins.left - this.margins.right;
		this.canvasHeight = this.renderingArea.height - this.margins.top - this.margins.bottom;
		this.widgetID = widgetID;
		//
		this.canvas = container
			.append("g")
			.attr("id", "plot_" + widgetID)
			.attr("transform", "translate(" +
				(this.renderingArea.x + this.margins.left) + ", " + (this.renderingArea.y + this.margins.top) + ")");


		//
		let that = this;
		this.canvas.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", totalWidth)
			.attr("height", totalHeight)
			.attr("fill", "white")
			.on("click", function () {
				that.canvas.selectAll("circle").attr("stroke-width", 1);
				that.canvas.select("#" + that.widgetID + "_label").remove();

				if (that.selectionCallback)
					that.selectionCallback();
			});

		//
		this.data = [];
		//Criacao da escala do eixo X e do objeto eixo X
		this.xScale = d3.scaleLinear()
			.range([0, this.canvasWidth]);
		this.xAxis = d3.axisBottom(this.xScale);
		//
		//this.xAxis.tickFormat(d3.format(".2"))
		this.xAxis.ticks(5);
		//
		this.canvas
			.append("g")
			.attr("class", "xAxis")
			.attr("transform", "translate(0," + this.canvasHeight + ")");

		//Criacao da escala do eixo Y e do objeto eixo Y
		this.yScale = d3.scaleLinear()
			.range([this.canvasHeight, 0]);
		this.yAxis = d3.axisLeft(this.yScale);
		//
		//this.yAxis.tickFormat(d3.format(".2"));
		this.yAxis.ticks(5);
		//
		this.canvas
			.append("g")
			.attr("class", "yAxis");
		//
		this.selectionCallback = undefined;

		//Criacao do grupo relativo a operacao de brush e implementacao do brush
		//var plot = this;
		// var brushGroup = this.canvas.append("g").attr("class","brush");
		// this.brush = d3.brush()
		//     .on("start",function(){
		// 	plot.canvas.selectAll("circle").attr("fill","black");
		//     })
		//     .on("brush",function(){
		// 	var selectedPoints = [];
		// 	var selection = d3.event.selection;
		// 	plot.canvas.selectAll("circle")
		// 	    .attr("fill",function(d,i){
		// 		var x = plot.xScale(d[0]);
		// 		var y = plot.yScale(d[1]);
		// 		if(selection[0][0]<=x && x<=selection[1][0] && //Checagem para observar se ponto esta dentro da selecao
		// 		   selection[0][1] <= y && y <= selection[1][1]){ //do brush, mudando a cor para laranja em caso positivo
		// 		    selectedPoints.push(i);
		// 		    return "orange";
		// 		}
		// 		else
		// 		    return "black";
		// 	    });
		// 	//
		// 	if(plot.selectionCallback)
		// 	    plot.selectionCallback(selectedPoints);
		//     });
		// brushGroup.call(this.brush);


		//
		this.showReferenceLines = true;
		this.canvas.append("line").attr("id", widgetID + "_lineX");
		this.canvas.append("line").attr("id", widgetID + "_lineY");

		//
		this.canvas.append("text").attr("id", widgetID + "_labelXAxis");
		this.canvas.append("text").attr("id", widgetID + "_labelYAxis");
		this.canvas.append("text").attr("id", widgetID + "_title");
		this.xLabel = "";
		this.yLabel = "";
		this.title = "";

		//
		this.canvas.append("text").attr("id", widgetID + "_label");

		//
		this.updatePlot();
	}

	setXAxisLabel(xLabel) {
		this.xLabel = xLabel;
	}

	setSelected(id) {
		//
		this.canvas.selectAll("circle").attr("stroke-width", 1);
		let that = this;
		//
		let sel = this.canvas.select("#" + this.widgetID + "_" + id);
		sel.attr("stroke-width", 2);
		let myData = sel.data()[0];
		let coords = [this.xScale(myData[0]),this.yScale(myData[1])];
		//
		this.canvas.select("#" + this.widgetID + "_label").remove();
		this.canvas.append("text")
			.attr("id", this.widgetID + "_label")
			.attr("x", coords[0])
			.attr("y", function (d) {
				if (coords[1] < 15)
					return 15 + coords[1]
				else
					return coords[1];
			})
			.attr("text-anchor", function () {
				if (coords[0] > that.canvasWidth * 0.75) {
					return "end";
				}
				else {
					return "start";
				}
			})
			.attr("fill", "red")
			.attr("font-weight", "bold")
			.text(myData[4]);
	}

	setSelectionCallback(f) {
		this.selectionCallback = f;
	}

	setTitle(t) {
		this.title = t;
	}


	setYAxisLabel(yLabel) {
		this.yLabel = yLabel;
	}

	//Funcao que recebe novos dados e ajusta scatterplot (eixos  e pontos) de acordo
	setData(newData) {
		//
		this.data = newData;
		//
		this.xScale.domain(d3.extent(newData, d => d[0]));
		this.yScale.domain(d3.extent(newData, d => d[1]));
		//
		this.updatePlot();
	}

	updateReferenceLines() {
		//
		let count = 0;
		let refX = 0;
		let refY = 0;
		this.data.forEach(d => {
			refX += d[0];
			refY += d[1];
			count += 1;
		});
		//
		refX /= count;
		refY /= count;

		//
		this.canvas.select("#" + this.widgetID + "_lineX")
			.attr("x1", this.xScale(refX))
			.attr("y1", 0)
			.attr("x2", this.xScale(refX))
			.attr("y2", this.canvasHeight)
			.attr("stroke", "black")
			.attr("stroke-dasharray", 4);

		//
		this.canvas.select("#" + this.widgetID + "_lineY")
			.attr("x1", 0)
			.attr("y1", this.yScale(refY))
			.attr("x2", this.xScale(this.xScale.domain()[1]))
			.attr("y2", this.yScale(refY))
			.attr("stroke", "black")
			.attr("stroke-dasharray", 4);

	}

	updateAxis() {
		var canvasWidth = this.canvasWidth;
		var canvasHeight = this.canvasHeight;

		//text label for the x axis
		//this.xAxis.tickFormat(d3.format(".1"));
		this.xAxis(this.canvas.select(".xAxis"));
		this.canvas.select("#" + this.widgetID + "_labelXAxis")
			.attr("x", (canvasWidth / 2.0))
			.attr("y", (canvasHeight + this.margins.top + 30))
			.style("text-anchor", "middle")
			.text(this.xLabel);

		//text label for the y axis
		//this.yAxis.tickFormat(d3.format(".1"));
		this.yAxis(this.canvas.select(".yAxis"));
		this.canvas.select("#" + this.widgetID + "_labelYAxis")
			.attr("transform", "rotate(-90)")
			.attr("y", 23 - this.margins.left)
			.attr("x", 0 - (canvasHeight / 2))
			.style("text-anchor", "middle")
			.text(this.yLabel);

		//
		this.canvas.select("#" + this.widgetID + "_title")
			.attr("x", (canvasWidth / 2.0))
			.attr("y", 5)
			.style("text-anchor", "middle")
			.text(this.title);
	}

	updateDots() {
		var circles = this.canvas
			.selectAll("circle")
			.data(this.data);
		circles.exit().remove();
		var plot = this;
		circles
			.enter()
			.append("circle")
			.merge(circles)
			.attr("cx", d => plot.xScale(d[0]))
			.attr("cy", d => plot.yScale(d[1]))
			.attr("r", 5)
			.attr("id", d => {
				return plot.widgetID + "_" + d[3];
			})
			.attr("stroke", "black")
			.attr("stroke-width", 1)
			.attr("fill", d => d[2]);
		//
		if (this.selectionCallback) {
			let that = this;
			this.canvas
				.selectAll("circle")
				.on("click", function () {
					//
					let target = d3.select(this);
					let myData = target.data()[0];
					that.canvas.selectAll("circle").attr("stroke-width", 1);
					let coords = d3.mouse(this);
					//
					target.attr("stroke-width", 2);
					//
					that.canvas.select("#" + that.widgetID + "_label").remove();
					that.canvas.append("text")
						.attr("id", that.widgetID + "_label")
						.attr("x", coords[0])
						.attr("y", function (d) {
							if (coords[1] < 15)
								return 15 + coords[1]
							else
								return coords[1];
						})
						.attr("text-anchor", function () {
							if (coords[0] > that.canvasWidth * 0.75) {
								return "end";
							}
							else {
								return "start";
							}
						})
						.attr("fill", "red")
						.attr("font-weight", "bold")
						.text(myData[4]);

					//
					that.selectionCallback(d3.select(this).data()[0][3]);
				});
		}
	}

	updatePlot() {
		this.updateAxis();
		this.updateReferenceLines();
		this.updateDots();
	}
}
