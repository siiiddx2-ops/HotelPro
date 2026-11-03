export function calculateStayPricing(room, checkIn, checkOut) {
  const start = /^\d{4}-\d{2}-\d{2}$/.test(checkIn || '') ? Date.parse(`${checkIn}T00:00:00Z`) : NaN;
  const finish = /^\d{4}-\d{2}-\d{2}$/.test(checkOut || '') ? Date.parse(`${checkOut}T00:00:00Z`) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish <= start) return { nights: 0, total: 0, averageNightlyRate: Number(room?.pricePerNight || 0) };
  let total = 0;
  let nights = 0;
  for (let day = start; day < finish; day += 86400000) {
    const seasonal = (room?.seasonalRates || []).find(rate => {
      const rateStart = Date.parse(`${String(rate.startDate).slice(0, 10)}T00:00:00Z`);
      const rateEnd = Date.parse(`${String(rate.endDate).slice(0, 10)}T00:00:00Z`);
      return day >= rateStart && day < rateEnd;
    });
    total += Number(seasonal?.pricePerNight || room?.pricePerNight || 0);
    nights += 1;
  }
  return { nights, total, averageNightlyRate: nights ? total / nights : 0 };
}
