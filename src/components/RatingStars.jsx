export default function RatingStars({ rating = 0 }) {
  const roundedRating = Math.round(rating);

  return (
    <div className="flex items-center gap-1 text-sm text-amber-500" aria-label={`Rating ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index}>{index < roundedRating ? '★' : '☆'}</span>
      ))}
      <span className="ml-1 text-slate-600">({rating.toFixed(1)})</span>
    </div>
  );
}
