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

const GDPCharting = (function () {

    let dataset = null;

    async function loadData() {
        if (dataset) return dataset;
        const url = "https://raw.githubusercontent.com/rm80/decoded/refs/heads/main/data/statsnz/regional-gross-domestic-product-year-ended-march-2024.csv";
        const raw = await d3.csv(url);
        dataset = raw.map(d => ({
            year: +d.Period.split(".")[0],
            region: d.Series_title_2,
            group: d.Group?.trim().toLowerCase(),
            metric: d.Series_title_3?.trim().toLowerCase() || "",
            value: +d.Data_value
        })).filter(d => !isNaN(d.value));
        return dataset;
    }

    function filterData({ metric, group, regionList, startYear, endYear }) {
        const metricLower = metric.toLowerCase();
        return dataset.filter(d => {
            const groupName = d.group;
            const regionMatch = !regionList || regionList.includes(d.region);
            const yearMatch = d.year >= startYear && d.year <= endYear;

            const isGdp = metricLower === "gross domestic product" &&
                          groupName === "gross domestic product, by region and industry" &&
                          d.metric === "gross domestic product";

            const isPerCapita = metricLower === "gdp per capita" &&
                                groupName === "gross domestic product per person, by region" &&
                                d.metric === "";

            return regionMatch && yearMatch && (isGdp || isPerCapita);
        });
    }

    function sortData(data, sortOption) {
        switch (sortOption) {
            case "alphabetical":
                return data.sort((a, b) => a.region.localeCompare(b.region));
            case "gdp-desc":
                return data.sort((a, b) => b.value - a.value);
            case "gdp-asc":
                return data.sort((a, b) => a.value - b.value);
            case "growth-desc":
                return data.sort((a, b) => (b.growth || 0) - (a.growth || 0));
            case "growth-asc":
                return data.sort((a, b) => (a.growth || 0) - (b.growth || 0));
            default:
                return data;       
        }
    }

    async function renderBarChart({
        containerId,
        regionList,
        metric = "Gross Domestic Product",
        year = 2024,
        sort = "gdp-desc",
        showLine = false,
        width = 900,
        height = 400
    }) {
        const data = await loadData();
        const group = metric === "GDP per capita"
            ? "gross domestic product per person, by region"
            : "gross domestic product, by region and industry";
    
        const filtered = filterData({ metric, group, regionList, startYear: year, endYear: year });
        const latest = filtered.filter(d => d.year === year);
        const sorted = sortData(latest, sort); // ✅ Apply sorting
    
        const margin = { top: 50, right: 50, bottom: 100, left: 80 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
    
        const svg = d3.select(`#${containerId}`);
        svg.selectAll("*").remove();
        svg.attr("width", width).attr("height", height);
    
        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    
        const x = d3.scaleBand()
            .domain(sorted.map(d => d.region))
            .range([0, innerW])
            .padding(0.3);
    
        const y = d3.scaleLinear()
            .domain([0, d3.max(sorted, d => d.value)])
            .nice()
            .range([innerH, 0]);
    
        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(sorted.map(d => d.region));
    
        chart.selectAll(".bar")
            .data(sorted)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.region))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => innerH - y(d.value))
            .attr("fill", d => color(d.region));
    
        if (showLine) {
            const line = d3.line()
                .x(d => x(d.region) + x.bandwidth() / 2)
                .y(d => y(d.value));
    
            chart.append("path")
                .datum(sorted)
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", line);
    
            chart.selectAll(".dot")
                .data(sorted)
                .enter()
                .append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.region) + x.bandwidth() / 2)
                .attr("cy", d => y(d.value))
                .attr("r", 4)
                .attr("fill", "white")
                .attr("stroke", "red")
                .attr("stroke-width", 1.5);
        }
    
        chart.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");
    
        chart.append("g")
            .call(d3.axisLeft(y).ticks(10).tickFormat(d => `$${d.toLocaleString()}`));
    }
    

    async function renderSmallMultiples({
        containerId,
        metric = "Gross Domestic Product",
        startYear = 2000,
        endYear = 2024,
        width = 220,
        height = 120
    }) {

        const container = d3.select(`#${containerId}`);    
     
        container.selectAll("*").remove();

        const group = metric === "GDP per capita"
            ? "gross domestic product per person, by region"
            : "gross domestic product, by region and industry";

        const data = await loadData();
        const filtered = filterData({ metric, group, startYear, endYear });

        const grouped = d3.groups(filtered, d => d.region);        

        const margin = { top: 20, right: 10, bottom: 20, left: 40 };

        grouped.forEach(([region, values]) => {
            const sortedValues = [...values].sort((a, b) => a.year - b.year);

            const svg = container.append("svg")
                .attr("width", width)
                .attr("height", height)
                .style("background", "#f9f9f9")
                .style("border", "1px solid #ccc")
                .style("box-shadow", "0 1px 2px rgba(0,0,0,0.1)");

            const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain(d3.extent(sortedValues, d => d.year))
                .range([0, width - margin.left - margin.right]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(sortedValues, d => d.value)])
                .nice()
                .range([height - margin.top - margin.bottom, 0]);

            const line = d3.line()
                .x(d => x(d.year))
                .y(d => y(d.value));

            g.append("path")
                .datum(sortedValues)
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
         

        });
    }
 

async function renderDumbbellPlot({
        containerId = "dumbbellPlot",
        metric = "Gross Domestic Product",
        startYear = 2000,
        endYear = 2024,
        sort = "growth-desc",
        regionList = null
    }) {

        console.log("Rendering dumbbell plot...");
        
        const svg = d3.select("#" + containerId);
        svg.selectAll("*").remove();
        
        const tooltip = d3.select("#tooltip");

        const width = +svg.attr("width");
        const height = +svg.attr("height");
        const margin = { top: 50, right: 80, bottom: 50, left: 150 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const data = await loadData();
        const group = metric === "GDP per capita"
            ? "gross domestic product per person, by region"
            : "gross domestic product, by region and industry";

        const filtered = filterData({ metric, group, regionList, startYear, endYear })
            .filter(d => d.year === startYear || d.year === endYear);

            const grouped = d3.groups(filtered, d => d.region).map(([region, values]) => {
                const start = values.find(d => d.year === startYear);
                const end = values.find(d => d.year === endYear);
                if (!start || !end) return null;
            
                return {
                    region,
                    start: start.value,
                    end: end.value,
                    growth: ((end.value - start.value) / start.value) * 100
                };
            }).filter(d => d);
            

        const sorted = sortData(grouped, sort);

        const y = d3.scaleBand()
            .domain(sorted.map(d => d.region))
            .range([0, innerH])
            .padding(0.4);

        const x = d3.scaleLinear()
            .domain([0, d3.max(sorted, d => Math.max(d.start, d.end))])
            .nice()
            .range([0, innerW]);

        g.append("g").call(d3.axisLeft(y));
        g.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x).tickFormat(d => `$${d3.format(",")(d)}`));

        g.selectAll(".line")
            .data(sorted)
            .enter()
            .append("line")
            .attr("x1", d => x(d.start))
            .attr("x2", d => x(d.end))
            .attr("y1", d => y(d.region) + y.bandwidth()/2)
            .attr("y2", d => y(d.region) + y.bandwidth()/2)
            .attr("stroke", "#888")
            .attr("stroke-width", 2);

        g.selectAll(".circle-start")
            .data(sorted)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.start))
            .attr("cy", d => y(d.region) + y.bandwidth()/2)
            .attr("r", 6)
            .attr("fill", "#2196f3")
            .on("mouseover", (e,d) => {
                tooltip.transition().style("opacity", 1);
                tooltip.html(`<strong>${d.region}</strong><br>Start (${startYear}): $${d3.format(",")(d.start)}`)
                    .style("left", e.pageX + 10 + "px")
                    .style("top", e.pageY - 30 + "px");
            })
            .on("mouseout", () => tooltip.transition().style("opacity", 0));

        g.selectAll(".circle-end")
            .data(sorted)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.end))
            .attr("cy", d => y(d.region) + y.bandwidth()/2)
            .attr("r", 6)
            .attr("fill", "#4caf50")
            .on("mouseover", (e,d) => {
                tooltip.transition().style("opacity", 1);
                tooltip.html(`<strong>${d.region}</strong><br>End (${endYear}): $${d3.format(",")(d.end)}<br>Growth: ${d.growth.toFixed(1)}%`)
                    .style("left", e.pageX + 10 + "px")
                    .style("top", e.pageY - 30 + "px");
            })
            .on("mouseout", () => tooltip.transition().style("opacity", 0));
    }
    return {
        loadData,
        filterData,
        sortData,
        renderBarChart,
        renderSmallMultiples,
        renderDumbbellPlot
    };
})();
    
    // export const GDPCharting = {
    //     loadData,
    //     filterData,
    //     sortData,
    //     renderBarChart,
    //     renderSmallMultiples,
    //     renderDumbbellPlot       
    // };
