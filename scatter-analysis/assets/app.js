(function() {
  'use strict';

  var YEARS = ['2022', '2023', '2024', '2025', '2026'];
  var INDUSTRY_COLORS = {
    '制造业': '#a855f7',
    '服务业': '#10b981',
    '其他行业': '#64748b'
  };
  var INDUSTRY_BG = {
    '制造业': 'rgba(168,85,247,0.15)',
    '服务业': 'rgba(16,185,129,0.15)',
    '其他行业': 'rgba(100,116,139,0.15)'
  };

  var currentYear = '2026';
  var chart = null;
  var isPlaying = false;
  var playTimer = null;
  var showTrajectory = false;
  var selectedSubIndustry = null;

  // DOM elements
  var yearDisplay = document.getElementById('yearDisplay');
  var yearSlider = document.getElementById('yearSlider');
  var sliderTrack = document.getElementById('sliderTrack');
  var sliderThumb = document.getElementById('sliderThumb');
  var yearMarkers = document.getElementById('yearMarkers');
  var playBtn = document.getElementById('playBtn');
  var sidePanel = document.getElementById('sidePanel');
  var panelTitle = document.getElementById('panelTitle');
  var panelTag = document.getElementById('panelTag');
  var panelSummary = document.getElementById('panelSummary');
  var companyList = document.getElementById('companyList');
  var closePanel = document.getElementById('closePanel');
  var trajectoryToggle = document.getElementById('trajectoryToggle');

  // Initialize chart
  function initChart() {
    chart = echarts.init(document.getElementById('chart'), null, { renderer: 'canvas' });
    updateChart();
    chart.on('click', function(params) {
      if (params.componentType === 'series' && params.data && params.data.subIndustry) {
        showCompanyPanel(params.data.subIndustry);
      }
    });
    window.addEventListener('resize', function() { chart.resize(); });
  }

  // Build scatter data for a given year
  function getScatterData(year) {
    var yearData = SCATTER_DATA[year];
    var series = {};
    ['制造业', '服务业', '其他行业'].forEach(function(ind) {
      series[ind] = [];
    });

    yearData.forEach(function(item) {
      var ind = item.industry;
      if (!series[ind]) series[ind] = [];
      series[ind].push({
        name: item.sub_industry,
        value: [item.revenue, item.profit, item.count],
        subIndustry: item.sub_industry,
        industry: ind,
        revenue: item.revenue,
        profit: item.profit,
        count: item.count,
        companies: item.companies,
        symbolSize: Math.sqrt(item.count) * 8 + 12
      });
    });

    return series;
  }

  // Build trajectory custom series for all sub-industries
  function getTrajectoryCustomSeries() {
    var allSubInds = {};

    YEARS.forEach(function(yr) {
      SCATTER_DATA[yr].forEach(function(item) {
        if (!allSubInds[item.sub_industry]) {
          allSubInds[item.sub_industry] = { industry: item.industry, points: [] };
        }
        allSubInds[item.sub_industry].points.push([item.revenue, item.profit]);
      });
    });

    var trajData = [];
    Object.keys(allSubInds).forEach(function(si) {
      var info = allSubInds[si];
      if (info.points.length >= 2) {
        trajData.push({
          coords: info.points,
          industry: info.industry,
          subIndustry: si
        });
      }
    });

    return {
      name: '5年轨迹',
      type: 'custom',
      data: trajData,
      coordinateSystem: 'cartesian2d',
      renderItem: function(params, api) {
        var item = trajData[params.dataIndex];
        if (!item || !item.coords || item.coords.length < 2) return;

        var points = item.coords.map(function(coord) {
          var p = api.coord([coord[0], coord[1]]);
          return [p[0], p[1]];
        });

        return {
          type: 'line',
          shape: { points: points },
          style: {
            stroke: INDUSTRY_COLORS[item.industry] || '#64748b',
            lineWidth: 1.5,
            opacity: 0.4,
            lineDash: [5, 4]
          },
          silent: true
        };
      },
      silent: true,
      z: 1,
      animation: false
    };
  }

  // Update chart with current year data
  function updateChart() {
    var seriesData = getScatterData(currentYear);
    var seriesList = [];

    // Trajectory lines (if enabled)
    if (showTrajectory) {
      seriesList.push(getTrajectoryCustomSeries());
    }

    // Scatter series for each industry
    ['制造业', '服务业', '其他行业'].forEach(function(ind) {
      seriesList.push({
        name: ind,
        type: 'scatter',
        data: seriesData[ind] || [],
        symbolSize: function(data) {
          return Math.sqrt(data[2]) * 8 + 12;
        },
        itemStyle: {
          color: INDUSTRY_COLORS[ind],
          opacity: 0.75,
          borderColor: '#ffffff',
          borderWidth: 1.5,
          shadowBlur: 8,
          shadowColor: INDUSTRY_COLORS[ind] + '40'
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
            borderWidth: 2,
            shadowBlur: 15,
            shadowColor: INDUSTRY_COLORS[ind] + '80'
          },
          label: {
            show: true,
            position: 'top',
            formatter: function(p) { return p.data.subIndustry; },
            color: '#f1f5f9',
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: 'rgba(15,23,42,0.85)',
            borderRadius: 4,
            padding: [4, 8]
          }
        },
        z: 10
      });
    });

    var option = {
      backgroundColor: 'transparent',
      title: {
        text: '细分行业营收与利润散点对比 (' + currentYear + '年)',
        subtext: 'X轴: 营业收入(亿美元)  |  Y轴: 利润(亿美元)  |  气泡大小: 企业数量',
        left: 'center',
        top: 10,
        textStyle: { color: '#f1f5f9', fontSize: 16, fontWeight: 700 },
        subtextStyle: { color: '#94a3b8', fontSize: 12 }
      },
      grid: {
        left: 80,
        right: 40,
        top: 80,
        bottom: 80
      },
      xAxis: {
        type: 'value',
        name: '营业收入 (亿美元)',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { color: '#94a3b8', fontSize: 13 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: {
          color: '#94a3b8',
          formatter: function(v) { return v.toLocaleString(); }
        },
        splitLine: { lineStyle: { color: 'rgba(51,65,85,0.3)', type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: '利润 (亿美元)',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: { color: '#94a3b8', fontSize: 13 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: {
          color: '#94a3b8',
          formatter: function(v) { return v.toLocaleString(); }
        },
        splitLine: { lineStyle: { color: 'rgba(51,65,85,0.3)', type: 'dashed' } }
      },
      legend: {
        data: ['制造业', '服务业', '其他行业'],
        top: 50,
        right: 20,
        textStyle: { color: '#94a3b8' },
        itemWidth: 14,
        itemHeight: 14,
        selected: showTrajectory ? { '制造业': true, '服务业': true, '其他行业': true } : null
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        { type: 'inside', yAxisIndex: 0, filterMode: 'none' },
        { type: 'slider', xAxisIndex: 0, filterMode: 'none', bottom: 15, height: 20,
          borderColor: '#334155', backgroundColor: '#1e293b',
          fillerColor: 'rgba(59,130,246,0.15)', handleStyle: { color: '#3b82f6' },
          textStyle: { color: '#94a3b8' } },
        { type: 'slider', yAxisIndex: 0, filterMode: 'none', right: 15, width: 20,
          borderColor: '#334155', backgroundColor: '#1e293b',
          fillerColor: 'rgba(59,130,246,0.15)', handleStyle: { color: '#3b82f6' },
          textStyle: { color: '#94a3b8' } }
      ],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15,23,42,0.95)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: function(params) {
          if (!params.data || !params.data.subIndustry) return '';
          var d = params.data;
          var margin = d.revenue > 0 ? (d.profit / d.revenue * 100).toFixed(1) : '0';
          return '<div style="font-weight:700;font-size:13px;margin-bottom:6px;">' + d.subIndustry +
            '</div><div style="display:flex;justify-content:space-between;gap:20px;margin:2px 0;">' +
            '<span style="color:#94a3b8;">营业收入</span><span style="font-weight:600;">' + d.revenue.toLocaleString() + ' 亿美元</span></div>' +
            '<div style="display:flex;justify-content:space-between;gap:20px;margin:2px 0;">' +
            '<span style="color:#94a3b8;">利润</span><span style="font-weight:600;">' + d.profit.toLocaleString() + ' 亿美元</span></div>' +
            '<div style="display:flex;justify-content:space-between;gap:20px;margin:2px 0;">' +
            '<span style="color:#94a3b8;">净利率</span><span style="font-weight:600;">' + margin + '%</span></div>' +
            '<div style="display:flex;justify-content:space-between;gap:20px;margin:2px 0;">' +
            '<span style="color:#94a3b8;">企业数量</span><span style="font-weight:600;">' + d.count + ' 家</span></div>' +
            '<div style="margin-top:6px;color:#3b82f6;font-size:11px;">点击查看企业列表 →</div>';
        }
      },
      series: seriesList,
      animation: true,
      animationDuration: 800,
      animationDurationUpdate: 800,
      animationEasingUpdate: 'cubicOut'
    };

    chart.setOption(option, { notMerge: true });
  }

  // Show company panel for a sub-industry
  function showCompanyPanel(subIndustry) {
    selectedSubIndustry = subIndustry;
    var yearData = SCATTER_DATA[currentYear];
    var item = yearData.find(function(d) { return d.sub_industry === subIndustry; });
    if (!item) return;

    // Panel header
    panelTitle.textContent = item.sub_industry;
    var indColor = INDUSTRY_COLORS[item.industry];
    panelTag.textContent = item.industry;
    panelTag.style.background = INDUSTRY_BG[item.industry];
    panelTag.style.color = indColor;

    // Summary
    var margin = item.revenue > 0 ? (item.profit / item.revenue * 100).toFixed(1) : '0';
    panelSummary.innerHTML =
      '<div class="summary-item"><div class="label">营收</div><div class="value accent">' + item.revenue.toLocaleString() + '</div></div>' +
      '<div class="summary-item"><div class="label">利润</div><div class="value accent2">' + item.profit.toLocaleString() + '</div></div>' +
      '<div class="summary-item"><div class="label">企业数</div><div class="value accent3">' + item.count + '</div></div>';

    // Company list
    var html = '';
    item.companies.forEach(function(c) {
      var rankClass = '';
      if (c.rank <= 10) rankClass = 'top10';
      else if (c.rank <= 50) rankClass = 'top50';

      var empStr = c.employees > 0 ? (c.employees > 10000 ? (c.employees / 10000).toFixed(1) + '万人' : c.employees + '人') : '-';
      var marginStr = c.margin ? c.margin + '%' : '-';

      html += '<div class="company-row">' +
        '<div class="company-rank ' + rankClass + '">' + c.rank + '</div>' +
        '<div class="company-info">' +
          '<div class="company-name">' + c.name + '</div>' +
          '<div class="company-meta">' +
            '<span>' + (c.country || '-') + '</span>' +
            '<span>净利率: ' + marginStr + '</span>' +
            '<span>员工: ' + empStr + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="company-revenue">' +
          '<div class="val">' + c.revenue.toLocaleString() + '</div>' +
          '<div class="unit">亿美元</div>' +
        '</div>' +
      '</div>';
    });
    companyList.innerHTML = html;

    // Show panel
    sidePanel.classList.remove('hidden');
  }

  // Update year display and slider
  function updateYearUI() {
    yearDisplay.textContent = currentYear;
    var idx = YEARS.indexOf(currentYear);
    var pct = (idx / (YEARS.length - 1)) * 100;
    sliderTrack.style.width = pct + '%';
    sliderThumb.style.left = pct + '%';

    // Update markers
    yearMarkers.querySelectorAll('span').forEach(function(span) {
      span.classList.toggle('active', span.dataset.year === currentYear);
    });
  }

  // Change year
  function setYear(year) {
    if (year === currentYear) return;
    currentYear = year;
    updateYearUI();
    updateChart();

    // If a sub-industry panel is open, refresh it
    if (selectedSubIndustry && !sidePanel.classList.contains('hidden')) {
      showCompanyPanel(selectedSubIndustry);
    }
  }

  // Play/pause animation
  function togglePlay() {
    if (isPlaying) {
      isPlaying = false;
      playBtn.textContent = '▶';
      clearInterval(playTimer);
    } else {
      isPlaying = true;
      playBtn.textContent = '⏸';
      var startIdx = YEARS.indexOf(currentYear);
      if (startIdx === YEARS.length - 1) startIdx = -1;
      playTimer = setInterval(function() {
        var idx = YEARS.indexOf(currentYear);
        if (idx >= YEARS.length - 1) {
          togglePlay();
          return;
        }
        setYear(YEARS[idx + 1]);
      }, 1500);
    }
  }

  // Slider interaction
  function initSlider() {
    var isDragging = false;

    function updateFromX(clientX) {
      var rect = yearSlider.getBoundingClientRect();
      var pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      var idx = Math.round(pct * (YEARS.length - 1));
      setYear(YEARS[idx]);
    }

    yearSlider.addEventListener('mousedown', function(e) {
      isDragging = true;
      updateFromX(e.clientX);
    });

    document.addEventListener('mousemove', function(e) {
      if (isDragging) updateFromX(e.clientX);
    });

    document.addEventListener('mouseup', function() { isDragging = false; });

    // Touch support
    yearSlider.addEventListener('touchstart', function(e) {
      isDragging = true;
      updateFromX(e.touches[0].clientX);
    });

    document.addEventListener('touchmove', function(e) {
      if (isDragging) updateFromX(e.touches[0].clientX);
    });

    document.addEventListener('touchend', function() { isDragging = false; });

    // Year marker clicks
    yearMarkers.querySelectorAll('span').forEach(function(span) {
      span.addEventListener('click', function() {
        setYear(this.dataset.year);
      });
    });
  }

  // Trajectory toggle
  function initTrajectoryToggle() {
    trajectoryToggle.addEventListener('click', function() {
      showTrajectory = !showTrajectory;
      trajectoryToggle.classList.toggle('active', showTrajectory);
      updateChart();
    });
  }

  // Close panel
  closePanel.addEventListener('click', function() {
    sidePanel.classList.add('hidden');
    selectedSubIndustry = null;
  });

  // Play button
  playBtn.addEventListener('click', togglePlay);

  // Initialize
  initChart();
  initSlider();
  initTrajectoryToggle();
  updateYearUI();
})();
