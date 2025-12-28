import { Motivation, IMotivation } from "./motivation.model";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

const createIntoDb = async (motivationData: Partial<IMotivation>) => {
  const result = await Motivation.create(motivationData);
  return result;
};

const updateIntoDb = async (
  id: string,
  data: Partial<IMotivation>
): Promise<IMotivation> => {
  const result = await Motivation.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Motivation not found");
  }

  return result;
};

const deleteItemFromDb = async (id: string) => {
  const result = await Motivation.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Motivation not found");
  }
  return result;
};

const getAllFromDb = async () => {
  const result = await Motivation.find().sort({ createdAt: -1 });
  return result;
};

export const motivationService = {
  createIntoDb,
  updateIntoDb,
  deleteItemFromDb,
  getAllFromDb,
};
