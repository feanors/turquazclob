import { createChart, ColorType } from "lightweight-charts";
import React, { useEffect, useRef, useState } from "react";
import "./SimpleChart.css";

export const SimpleChart = () => {
  const volumeSeriesRef = useRef();

  const ma7SeriesRef = useRef();
  const ma25SeriesRef = useRef();
  const ma99SeriesRef = useRef();

  const chartContainerRef = useRef();

  const newSeriesRef = useRef();
  let newPriceCounter = useRef(0);
  let newPriceCounterCounter = useRef(1);

  const backgroundColor = "#171923";
  const lineColor = "#2962FF";
  const textColor = "rgba(210, 210, 210, 0.7)";
  const candleUpColor = "green";
  const candleDownColor = "red";
  const candleBorderColor = "black";
  const initialVolumeData = generateVolumeData(initialData);


  useEffect(() => {
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      grid: {
        vertLines: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        horzLines: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },

      rightPriceScale: {
        right: {
          lastVisiblePrice: false,
        }
      },

      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time, tickMarkType, locale) => {
          const date = new Date(time * 1000);
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return `${hours}:${minutes}`;
        },
      },

      width: chartContainerRef.current.clientWidth,
      height: 450,
    });

    newSeriesRef.current = chart.addCandlestickSeries({
      upColor: "#38A169",
      downColor: "#E53E3E",
      borderDownColor: "#E53E3E",
      borderUpColor: "#38A169",
      wickDownColor: "#E53E3E",
      wickUpColor: "#38A169",
      priceLineVisible: false,
    });
    newSeriesRef.current.setData(initialData);

    volumeSeriesRef.current = chart.addHistogramSeries({
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
      priceLineVisible: false,
    });

    newSeriesRef.current.priceScale().applyOptions({
      // set the positioning of the volume series
      scaleMargins: {
        top: 0.02, // highest point of the series will be 70% away from the top
        bottom: 0.3,
      },
    });

    volumeSeriesRef.current.priceScale().applyOptions({
      // set the positioning of the volume series
      scaleMargins: {
        top: 0.9, // highest point of the series will be 70% away from the top
        bottom: 0,
      },
    });

    volumeSeriesRef.current.setData(initialVolumeData);

    ma7SeriesRef.current = chart.addLineSeries({
      color: "yellow",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
    });
    const ma7Data = calculateMovingAverage(7, initialData);
    ma7SeriesRef.current.setData(ma7Data);
    ma7SeriesRef.current.priceScale().applyOptions({
      // set the positioning of the volume series
      scaleMargins: {
        top: 0.02, // highest point of the series will be 70% away from the top
        bottom: 0.3,
      },
    });

    ma25SeriesRef.current = chart.addLineSeries({
      color: "lightblue",
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      lastValueVisible: false,

    });
    const ma25Data = calculateMovingAverage(25, initialData);
    ma25SeriesRef.current.setData(ma25Data);
    ma25SeriesRef.current.priceScale().applyOptions({
      // set the positioning of the volume series
      scaleMargins: {
        top: 0.02, // highest point of the series will be 70% away from the top
        bottom: 0.3,
      },
    });

    ma99SeriesRef.current = chart.addLineSeries({
      color: "purple",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    const ma99Data = calculateMovingAverage(99, initialData);
    ma99SeriesRef.current.setData(ma99Data);
    ma99SeriesRef.current.priceScale().applyOptions({
      // set the positioning of the volume series
      scaleMargins: {
        top: 0.02, // highest point of the series will be 70% away from the top
        bottom: 0.3,
      },
    });
    let volume = 0;
    const updateInterval = setInterval(() => {
      newPriceCounter.current++;
      const newPrice = generateNewPrice();
      newSeriesRef.current.update(newPrice);
      volume += (100 - Math.random() * 100) / 10
      const newVolume = {
        time: newPrice.time,
        value: volume,
        color: newPrice.close > newPrice.open ? "rgba(56,161,105,0.7)" : "rgba(229, 62, 62, 0.7)",
      }
      volumeSeriesRef.current.update(newVolume)
      initialData[initialData.length - 1] = newPrice;
      initialVolumeData[initialVolumeData.length - 1] = newVolume; 
      if (newPriceCounter.current % 20 == 0) {
        volume = 0;
        const lastCandle = initialData[initialData.length - 1];
        const time = lastCandle.time + 60;
        const newCandle = {
          time: time,
          open: lastCandle.close,
          high: lastCandle.close,
          low: lastCandle.close,
          close: lastCandle.close,
        };
        initialData.push(newCandle);
        newSeriesRef.current.setData(initialData);

        initialVolumeData.push({
          time: time,
          value: 100 - Math.random() * 100,
          color: newCandle.open > lastCandle.close ? "rgba(56,161,105,0.7)" : "rgba(229, 62, 62, 0.7)",
        })
        volumeSeriesRef.current.setData(initialVolumeData)

        newPriceCounterCounter.current++;
        newPriceCounter.current = 0;
      }
      const ma7Data = calculateMovingAverage(7, initialData);
      ma7SeriesRef.current.setData(ma7Data);
      const ma25Data = calculateMovingAverage(25, initialData);
      ma25SeriesRef.current.setData(ma25Data);
      const ma99Data = calculateMovingAverage(99, initialData);
      ma99SeriesRef.current.setData(ma99Data);
      console.log(newPriceCounter.current);
    }, 200);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      chart.remove();
      clearInterval(updateInterval);
    };
  }, [
    initialData,
    backgroundColor,
    lineColor,
    textColor,
    candleUpColor,
    candleDownColor,
    candleBorderColor,
  ]);

  return <div ref={chartContainerRef} />;
};

function generateNewPrice() {
  const lastCandle = initialData[initialData.length - 1];
  const change = (Math.random() * 2 - 1) * 0.5; // Random price change between -2 and 2
  const close = lastCandle.close + change; // Calculate the close price
  const open = lastCandle.close; // Open of the current candle is the close of the previous candle
  const high = Math.max(open, close) + Math.random(); // Calculate the high price
  const low = Math.min(open, close) - Math.random(); // Calculate the low price

  const newPrice = {
    ...lastCandle,
    high: lastCandle.high > high ? lastCandle.high : high,
    low: lastCandle.low < low ? lastCandle.low : low,
    close,
  };

  return newPrice;
}

const generateMinutelyData = () => {
  let generatedData = [];
  const startDate = new Date("2018-12-01T00:00:00Z"); // Start date for the data

  let open = 100; // Starting open price
  let close = open;

  for (let i = 0; i < 3000; i++) {
    // Generating data for 300 minutes
    const time = new Date(startDate.getTime() + i * 60 * 1000); // Adding i minutes to the start date
    const unixTime = Math.floor(time.getTime() / 1000); // Converting to Unix timestamp
    const volume = 20;
    open = close; // Open of the current candle is the close of the previous candle
    const change = (Math.random() * 2 - 1) * 0.5; // Random price change between -0.5 and 0.5
    close = open + change; // Calculate the close price
    const high = Math.max(open, close) + Math.random() * 0.5; // Calculate the high price
    const low = Math.min(open, close) - Math.random() * 0.5; // Calculate the low price

    generatedData.push({ time: unixTime, open, high, low, close, volume });
  }

  return generatedData;
};

function generateVolumeData(priceData) {
  return priceData.map((entry, index) => {
    const color = entry.close > entry.open ? "rgba(56,161,105,0.7)" : "rgba(229, 62, 62, 0.7)";
    return {
      time: entry.time,
      value: 100 - Math.random() * 100,
      color: color,
    };
  });
}

function calculateMovingAverage(period, data) {
  let sum = 0;
  let movingAverageData = [];

  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;

    if (i >= period) {
      sum -= data[i - period].close;
    }

    const movingAverageValue = sum / (i < period ? i + 1 : period);
    movingAverageData.push({ time: data[i].time, value: movingAverageValue });
  }

  return movingAverageData;
}

const initialData = generateMinutelyData();

const initialData2 = [
  { time: "2018-12-22", open: 32.51, high: 34.1, low: 31.9, close: 32.2 },
  { time: "2018-12-23", open: 32.2, high: 32.3, low: 29.6, close: 30.8 },
  { time: "2018-12-24", open: 30.8, high: 31.5, low: 26.1, close: 27.9 },
  { time: "2018-12-25", open: 27.9, high: 28.8, low: 26.4, close: 28.0 },
  { time: "2018-12-26", open: 28.0, high: 26.8, low: 24.1, close: 26.2 },
  { time: "2018-12-27", open: 28.89, high: 29.4, low: 27.2, close: 28.5 },
  { time: "2018-12-28", open: 25.46, high: 27.2, low: 25.0, close: 25.8 },
  { time: "2018-12-29", open: 23.92, high: 25.1, low: 22.3, close: 24.1 },
  { time: "2018-12-30", open: 22.68, high: 23.9, low: 21.5, close: 22.8 },
  { time: "2018-12-31", open: 22.67, high: 23.5, low: 21.8, close: 23.0 },
  { time: "2018-12-22", open: 32.51, high: 34.1, low: 31.9, close: 32.2 },
  { time: "2018-12-23", open: 32.2, high: 32.3, low: 29.6, close: 30.8 },
  { time: "2018-12-24", open: 30.8, high: 31.5, low: 26.1, close: 27.9 },
  { time: "2018-12-25", open: 27.9, high: 28.8, low: 26.4, close: 28.0 },
  { time: "2018-12-26", open: 28.0, high: 26.8, low: 24.1, close: 26.2 },
  { time: "2018-12-27", open: 28.89, high: 29.4, low: 27.2, close: 28.5 },
  { time: "2018-12-28", open: 25.46, high: 27.2, low: 25.0, close: 25.8 },
  { time: "2018-12-29", open: 23.92, high: 25.1, low: 22.3, close: 24.1 },
  { time: "2018-12-30", open: 22.68, high: 23.9, low: 21.5, close: 22.8 },
  { time: "2018-12-31", open: 22.67, high: 23.5, low: 21.8, close: 23.0 },
];

export default SimpleChart;
