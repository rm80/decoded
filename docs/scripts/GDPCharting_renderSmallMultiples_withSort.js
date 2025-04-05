
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
            default:
                return data;
        }
    }

    async function renderBarChart({ containerId, regionList, metric = "Gross Domestic Product", year = 2024, sort = "gdp-desc", showLine = false, width = 900, height = 400 }) {
        const data = await loadData();
        const group = metric === "GDP per capita"
            ? "gross domestic product per person, by region"
            : "gross domestic product, by region and industry";

        const filtered = filterData({ metric, group, regionList, startYear: year, endYear: year });
        const latest = filtered.filter(d => d.year === year);

        const margin = { top: 50, right: 50, bottom: 100, left: 80 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(`#${containerId}`);
        svg.selectAll("*").remove();
        svg.attr("width", width).attr("height", height);

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(latest.map(d => d.region))
            .range([0, innerW])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(latest, d => d.value)])
            .nice()
            .range([innerH, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(latest.map(d => d.region));

        chart.selectAll(".bar")
            .data(latest)
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
                .datum(latest)
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", line);

            chart.selectAll(".dot")
                .data(latest)
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
        console.log("1. Rendering to", containerId, "with metric:", metric);
     
        container.selectAll("*").remove();

        const group = metric === "GDP per capita"
            ? "gross domestic product per person, by region"
            : "gross domestic product, by region and industry";

        const data = await loadData();
        const filtered = filterData({ metric, group, startYear, endYear });

        console.log("2. Filtered rows for " + metric + ":", filtered.length);

        const grouped = d3.groups(filtered, d => d.region);
        console.log("3. Grouped regions:", grouped.map(g => g[0]));

        const margin = { top: 20, right: 10, bottom: 20, left: 40 };

        grouped.forEach(([region, values]) => {
            const sortedValues = [...values].sort((a, b) => a.year - b.year);

            console.log("4. Rendering:", metric, "| Region:", region);
            console.table(sortedValues.map(d => ({
                year: d.year,
                value: d.value,
                group: d.group,
                metric: d.metric
            })));

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

                console.log("5. Rendering to", containerId, "with metric:", metric);
            

        });
    }

    return {
        loadData,
        filterData,
        sortData,
        renderBarChart,
        renderSmallMultiples
    };
})();
