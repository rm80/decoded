function BuildCharts(svgId) {
    // URL to fetch the CSV data
    const dataUrl = "https://raw.githubusercontent.com/rm80/decoded/refs/heads/main/data/statsnz/regional-gross-domestic-product-year-ended-march-2024.csv";

    // Dimensions and margins
    const margin = { top: 50, right: 50, bottom: 100, left: 80 },
          width = 900 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    // Select the existing SVG and chart group
    const svg = d3.select(`#${svgId}`).select("svg");
    const chartGroup = svg.select("#chart-group");

    // Tooltip setup
    const tooltip = d3.select("body")
                      .append("div")
                      .attr("class", "tooltip");

    // Fetch and process the CSV data
    d3.csv(dataUrl).then(data => {
        // Filter data based on required conditions
        const filteredData = data.filter(d =>
            d.Group === "Gross domestic product, by region and industry" &&
            d.Series_title_3 === "Gross Domestic Product" &&
            d.Period === "2024.03" &&
            !["New Zealand", "Total North Island", "Total South Island"].includes(d.Series_title_2)
        );

        // Convert Data_value to numbers
        filteredData.forEach(d => {
            d.Data_value = +d.Data_value;
        });

        // X and Y scales
        const x = d3.scaleBand()
                    .domain(filteredData.map(d => d.Series_title_2))
                    .range([0, width])
                    .padding(0.3);

        const y = d3.scaleLinear()
                    .domain([0, d3.max(filteredData, d => d.Data_value)])
                    .nice()
                    .range([height, 0]);

        // Define color scale for unique colors
        const color = d3.scaleOrdinal(d3.schemeCategory10)
                        .domain(filteredData.map(d => d.Series_title_2));

        // Add gridlines
        chartGroup.append("g")
                  .attr("class", "grid")
                  .call(d3.axisLeft(y)
                          .tickSize(-width)
                          .tickFormat("")
                  );

        // Add bars with unique colors and animation
        chartGroup.selectAll(".bar")
                  .data(filteredData)
                  .enter()
                  .append("rect")
                  .attr("class", "bar")
                  .attr("x", d => x(d.Series_title_2))
                  .attr("y", height) // Start from bottom for animation
                  .attr("width", x.bandwidth())
                  .attr("height", 0)
                  .attr("fill", d => color(d.Series_title_2))
                  .transition()
                  .duration(1000)
                  .attr("y", d => y(d.Data_value))
                  .attr("height", d => height - y(d.Data_value));

        // Line generator
        const line = d3.line()
                       .x(d => x(d.Series_title_2) + x.bandwidth() / 2)
                       .y(d => y(d.Data_value));

        // Add line graph
        chartGroup.append("path")
                  .datum(filteredData)
                  .attr("class", "line")
                  .attr("d", line)
                  .attr("stroke-dasharray", function() {
                      const length = this.getTotalLength();
                      return `${length} ${length}`;
                  })
                  .attr("stroke-dashoffset", function() {
                      return this.getTotalLength();
                  })
                  .transition()
                  .duration(1200)
                  .attr("stroke-dashoffset", 0);

        // Add dots on the line
        chartGroup.selectAll(".dot")
                  .data(filteredData)
                  .enter()
                  .append("circle")
                  .attr("class", "dot")
                  .attr("cx", d => x(d.Series_title_2) + x.bandwidth() / 2)
                  .attr("cy", d => y(d.Data_value))
                  .attr("r", 5);

        // Add x-axis
        chartGroup.append("g")
                  .attr("transform", `translate(0,${height})`)
                  .call(d3.axisBottom(x))
                  .selectAll("text")
                  .attr("transform", "rotate(-45)")
                  .style("text-anchor", "end");

        // Add y-axis
        chartGroup.append("g")
                  .call(d3.axisLeft(y).ticks(10).tickFormat(d => `$${d.toLocaleString()}`));

        // Tooltip for hover on bars and line dots
        chartGroup.selectAll(".bar, .dot")
                  .on("mouseover", (event, d) => {
                      tooltip.transition().duration(200).style("opacity", 1);
                      tooltip.html(`
                          <strong>Region:</strong> ${d.Series_title_2}<br>
                          <strong>GDP:</strong> $${d.Data_value.toLocaleString()}
                      `)
                      .style("left", (event.pageX + 10) + "px")
                      .style("top", (event.pageY - 28) + "px");
                  })
                  .on("mousemove", (event) => {
                      tooltip.style("left", (event.pageX + 10) + "px")
                             .style("top", (event.pageY - 28) + "px");
                  })
                  .on("mouseout", () => {
                      tooltip.transition().duration(500).style("opacity", 0);
                  });
    }).catch(error => {
        console.error("Error loading or parsing data:", error);
    });
}