    //<![CDATA[
function buildNZregionalGDPBarChartSimple(svgid) {
    const csvUrl = "https://raw.githubusercontent.com/rm80/decoded/refs/heads/main/data/statsnz/regional-gross-domestic-product-year-ended-march-2024.csv";

    // Select SVG using its id
    //const svg = d3.select("#NzRegionGDPBarChartSimple");
    const svg = d3.select(svgid);

    // Fetch and visualize the data
    d3.csv(csvUrl).then(data => {
      const aggregatedData = d3.rollups(
        data,
        v => d3.sum(v, d => +d.Data_value) / 1e6, // Convert to millions
        d => d.Series_title_2
      ).map(([region, total]) => ({ region, total }));

      const width = 800;
      const height = 400;
      const margin = { top: 20, right: 30, bottom: 50, left: 60 };

      // Generate a color scale for regions
      const colorScale = d3.scaleOrdinal()
        .domain(aggregatedData.map(d => d.region))
        .range(d3.schemeCategory10);

      const xScale = d3.scaleBand()
        .domain(aggregatedData.map(d => d.region))
        .range([margin.left, width - margin.right])
        .padding(0.1);

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(aggregatedData, d => d.total)])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // Add X-axis
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

      // Add Y-axis
      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale));

      // Add bars
      svg.selectAll(".bar")
        .data(aggregatedData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.region))
        .attr("y", d => yScale(d.total))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - margin.bottom - yScale(d.total))
        .attr("fill", d => colorScale(d.region));

      // Add labels
      svg.selectAll(".label")
        .data(aggregatedData)
        .enter().append("text")
        .attr("x", d => xScale(d.region) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.total) - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => d.total.toFixed(2));
    }).catch(error => {
      console.error("Error loading the CSV file:", error);
    });
}
 //]]>
