// ────────────────────────────────────────────────────────────────
// models/baseOptions.js
// Shared Mongoose schema options to avoid repetition across models
// ────────────────────────────────────────────────────────────────

const transform = (_, ret) => {
  delete ret._id; // hide internal Mongo id in JSON output
  return ret;
};

export const BASE_OPTIONS = {
  timestamps: true, // adds createdAt / updatedAt
  versionKey: false, // drop __v
  toJSON: { virtuals: true, transform },
};
