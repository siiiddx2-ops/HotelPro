const dateOnlyUtc = value => {
  let year;
  let month;
  let day;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    year = value.getUTCFullYear();
    month = value.getUTCMonth();
    day = value.getUTCDate();
  } else {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    year = Number(match[1]);
    month = Number(match[2]) - 1;
    day = Number(match[3]);
  }

  const date = new Date(Date.UTC(year, month, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

function calculateStayPrice(room, checkInValue, checkOutValue) {
  const checkIn = dateOnlyUtc(checkInValue);
  const checkOut = dateOnlyUtc(checkOutValue);
  if (!checkIn || !checkOut || checkOut <= checkIn) return { nights: 0, total: 0, averageNightlyRate: Number(room.pricePerNight || 0) };
  let nights = 0;
  let total = 0;
  for (let day = new Date(checkIn); day < checkOut; day.setUTCDate(day.getUTCDate() + 1)) {
    const current = day.getTime();
    const seasonal = (room.seasonalRates || []).find(rate => {
      const start = dateOnlyUtc(rate.startDate);
      const end = dateOnlyUtc(rate.endDate);
      return start && end && current >= start.getTime() && current < end.getTime();
    });
    total += Number(seasonal?.pricePerNight || room.pricePerNight);
    nights += 1;
  }
  return { nights, total, averageNightlyRate: nights ? total / nights : Number(room.pricePerNight || 0) };
}

module.exports = { calculateStayPrice, dateOnlyUtc };
