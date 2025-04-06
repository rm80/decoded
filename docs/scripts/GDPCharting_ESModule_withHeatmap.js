
export const GDPCharting = {
  async renderYoYGrowthHeatmap({
    containerId,
    metric = "Gross Domestic Product",
    regionList = null,
    startYear = 2001,
    endYear = 2024
  }) {
    const svg = d3.select("#" + containerId);
    svg.selectAll("*").remove();
    const tooltip = d3.select("#tooltip");

    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const margin = { top: 50, right: 50, bottom: 100, left: 120 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const colorScale = d3.scaleSequential()
      .interpolator(d3.interpolateRdYlGn)
      .domain([-10, 10]);

    const dataURL = "https://raw.githubusercontent.com/rm80/decoded/main/data/statsnz/regional-gross-domestic-product-year-ended-march-2024.csv";
    const raw = await d3.csv(dataURL);

    const dataset = raw.map(d => ({
      year: +d.Period.split(".")[0],
      region: d.Series_title_2,
      group: d.Group?.trim().toLowerCase(),
      metric: d.Series_title_3?.trim().toLowerCase() || "",
      value: +d.Data_value * Math.pow(10, +d.MAGNTUDE)
    })).filter(d =>
      d.group === "gross domestic product, by region and industry" &&
      d.metric === "gross domestic product" &&
      !isNaN(d.value)
    );

    const grouped = d3.groups(dataset, d => d.region).map(([region, values]) => {
      if (regionList && !regionList.includes(region)) return [];
      const rows = values.filter(d => d.year >= startYear - 1 && d.year <= endYear).sort((a, b) => a.year - b.year);
      const result = [];
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1];
        const curr = rows[i];
        const growth = ((curr.value - prev.value) / prev.value) * 100;
        result.push({ region, year: curr.year, growth });
      }
      return result;
    }).flat().filter(d => d);

    const years = [...new Set(grouped.map(d => d.year))].sort((a, b) => a - b);
    const regions = [...new Set(grouped.map(d => d.region))].sort();

    const x = d3.scaleBand().domain(years).range([0, innerW]).padding(0.05);
    const y = d3.scaleBand().domain(regions).range([0, innerH]).padding(0.05);

    g.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-size", "11px");

    g.append("g")
      .attr("transform", `translate(0, ${innerH})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    g.selectAll(".cell")
      .data(grouped)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", d => x(d.year))
      .attr("y", d => y(d.region))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => colorScale(d.growth))
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`<strong>${d.region}</strong><br>${d.year}: ${d.growth.toFixed(2)}%`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 30) + "px");
      })
      .on("mouseout", () => tooltip.transition().duration(300).style("opacity", 0));

    // Legend
    const legendWidth = 300;
    const legendHeight = 12;
    const legendX = innerW / 2 - legendWidth / 2;

    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient").attr("id", "legend-gradient");
    gradient.selectAll("stop")
      .data([
        { offset: "0%", color: colorScale(-10) },
        { offset: "50%", color: colorScale(0) },
        { offset: "100%", color: colorScale(10) }
      ])
      .enter().append("stop")
      .attr("offset", d => d.offset)
      .attr("stop-color", d => d.color);

    svg.append("g")
      .attr("transform", `translate(${margin.left + legendX}, ${margin.top + innerH + 50})`)
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    const legendScale = d3.scaleLinear().domain([-10, 10]).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5).tickFormat(d => `${d}%`);

    svg.append("g")
      .attr("transform", `translate(${margin.left + legendX}, ${margin.top + innerH + 50 + legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "11px");
  }
};
