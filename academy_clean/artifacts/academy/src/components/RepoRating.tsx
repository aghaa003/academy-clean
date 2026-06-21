import { useState } from "react";
import { Star } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

interface RepoRatingProps {
  repositoryId: number;
  averageRating: number;
  ratingsCount: number;
  /** Viewer is the owner of this repo — rating is shown read-only, no input allowed. */
  isOwner: boolean;
  /** Viewer must be signed in to rate. */
  canRate: boolean;
}

/**
 * Read-only average display for everyone, plus a clickable 1-5 star input for
 * any signed-in viewer who is NOT the repo's owner (owners cannot rate their
 * own work — enforced again server-side regardless of this UI gate).
 */
export function RepoRating({ repositoryId, averageRating, ratingsCount, isOwner, canRate }: RepoRatingProps) {
  const [avg, setAvg] = useState(averageRating);
  const [count, setCount] = useState(ratingsCount);
  const [hover, setHover] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [yourRating, setYourRating] = useState<number | null>(null);

  const interactive = canRate && !isOwner;

  const submitRating = async (value: number) => {
    if (!interactive || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/repositories/${repositoryId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvg(data.averageRating ?? value);
        setCount(data.ratingsCount ?? count);
        setYourRating(value);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hover ?? yourRating ?? Math.round(avg)) >= star;
        return (
          <Star
            key={star}
            size={16}
            className={interactive ? "cursor-pointer" : ""}
            fill={filled ? "#f59e0b" : "none"}
            stroke="#f59e0b"
            onMouseEnter={() => interactive && setHover(star)}
            onMouseLeave={() => interactive && setHover(null)}
            onClick={() => submitRating(star)}
          />
        );
      })}
      <span className="text-xs text-gray-500 mr-1">
        {avg > 0 ? avg.toFixed(1) : "—"} ({count})
      </span>
    </div>
  );
}
