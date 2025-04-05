function applySorting(data, sortOption) {
    switch (sortOption) {
        case "alphabetical-asc":
            return data.sort((a, b) => a.Series_title_2.localeCompare(b.Series_title_2));
        case "alphabetical-desc":
            return data.sort((a, b) => b.Series_title_2.localeCompare(a.Series_title_2));
        case "gdp-asc":
            return data.sort((a, b) => a.Data_value - b.Data_value);
        case "gdp-desc":
            return data.sort((a, b) => b.Data_value - a.Data_value);
        default:
            return data; // No sorting
    }
}


function BuildCharts(groupId, regionList, sortOption = "none", metric = "Gross Domestic Product") {

    // URL to fetch the CSV data
    const regionalData2024Url = "https://raw.githubusercontent.com/rm80/decoded/refs/heads/main/data/statsnz/regional-gross-domestic-product-year-ended-march-2024.csv";

    // Dimensions and margins
    const margin = { top: 50, right: 50, bottom: 100, left: 80 },
          width = 900 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;

    // Select the existing SVG and chart group
    const chartGroup = d3.select(`#${groupId}`);

    // Tooltip setup
    const tooltip = d3.select("body")
                      .append("div")
                      .attr("class", "tooltip");

    // Fetch and process the CSV data
    d3.csv(regionalData2024Url).then(data => {
        
        // Filter data based on required conditions
        // const filteredData = data.filter(d =>
        //     d.Group === "Gross domestic product, by region and industry" &&
        //     d.Series_title_3 === metric &&
        //     d.Period === "2024.03" &&
        //     regionList.map(r => r.trim().toLowerCase()).includes(d.Series_title_2.trim().toLowerCase())
        // );

        const filteredData = data.filter(d => {
            const groupName = d.Group?.trim().toLowerCase();
            const metricLower = metric.trim().toLowerCase();
        
            const isGdp = metricLower === "gross domestic product" &&
                          groupName === "gross domestic product, by region and industry" &&
                          d.Series_title_3?.trim().toLowerCase() === "gross domestic product";           

            const isPerCapita = metricLower === "gdp per capita" &&
                                groupName === "gross domestic product per person, by region" &&
                                (!d.Series_title_3 || d.Series_title_3.trim() === "");            
        
            return d.Period === "2024.03" &&
                   regionList.map(r => r.trim().toLowerCase()).includes(d.Series_title_2.trim().toLowerCase()) &&
                   (isGdp || isPerCapita);
        });
                            
        // Convert Data_value to numbers
        filteredData.forEach(d => {
            d.Data_value = +d.Data_value;
        });

        // Apply sorting
        const sortedData = applySorting(filteredData, sortOption);

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

function downloadAllContainers() {
    const containers = document.querySelectorAll(".chart-container");

    containers.forEach((container, index) => {
        setTimeout(() => {
            html2canvas(container, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                padding: 0,
                scrollX: 0,
                scrollY: 0
            }).then(canvas => {
                const cropped = cropCanvas(canvas);
                const link = document.createElement("a");
                const filename = container.id ? `${container.id}.png` : `chart-${index + 1}.png`;
                link.download = filename;
                link.href = canvas.toDataURL("image/png");
                link.click();
            });
        }, index * 1200); // Slight delay to avoid collisions
    });
}

function cropCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    let top = null, bottom = null, left = null, right = null;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3];
            const isWhite = data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240;

            if (alpha > 0 && !isWhite) {
                if (top === null) top = y;
                bottom = y;
                if (left === null || x < left) left = x;
                if (right === null || x > right) right = x;
            }
        }
    }

    if (top === null) return canvas; // fallback: no visible pixels found

    const croppedWidth = right - left + 1;
    const croppedHeight = bottom - top + 1;

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;

    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCtx.drawImage(canvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

    return croppedCanvas;
}

async function renderSmallMultiples() {
    const dataURL = "https://raw.githubusercontent.com/rm80/decoded/refs/heads/main/data/statsnz/regional-gross-domestic-product-year-ended-march-2024.csv";

    const data = await d3.csv(dataURL);

    const filtered = data.filter(d =>
        d.Group?.trim().toLowerCase() === "gross domestic product, by region and industry" &&
        d.Series_title_3?.trim().toLowerCase() === "gross domestic product"
    );

    const parsed = filtered.map(d => ({
        year: +d.Period.split(".")[0],
        region: d.Series_title_2,
        gdp: +d.Data_value
    }));

    const regions = Array.from(new Set(parsed.map(d => d.region))).sort();

    const container = d3.select("#small-multiples-container");
    const width = 220, height = 120, margin = { top: 20, right: 10, bottom: 20, left: 40 };

    regions.forEach(region => {
        const regionData = parsed.filter(d => d.region === region).sort((a, b) => a.year - b.year);

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("background", "#f9f9f9")
            .style("border", "1px solid #ccc")
            .style("box-shadow", "0 1px 2px rgba(0,0,0,0.1)");

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain(d3.extent(regionData, d => d.year))
            .range([0, width - margin.left - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(regionData, d => d.gdp)])
            .nice()
            .range([height - margin.top - margin.bottom, 0]);

        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.gdp));

        g.append("path")
            .datum(regionData)
            .attr("fill", "none")
            .attr("stroke", "#1976d2")
            .attr("stroke-width", 2)
            .attr("d", line);

        g.append("text")
            .attr("x", (width - margin.left - margin.right) / 2)
            .attr("y", -8)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(region);

        // Optional: last GDP value label
        const last = regionData[regionData.length - 1];
        g.append("text")
            .attr("x", x(last.year))
            .attr("y", y(last.gdp))
            .attr("dx", "4px")
            .attr("dy", "0.35em")
            .attr("font-size", "10px")
            .attr("fill", "#444")
            .text(`$${Math.round(last.gdp / 1e3)}B`);
    });
}

