"use client";
import { Lineage, useLineage } from "@/hooks/useSupervisorLineage";
import { useEffect, useState } from "react";
import { lineageSchema } from "@/lib/types";
import { z } from "zod";
import { Trash, Plus, Buildings } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeIn, fadeInUp } from "@/components/ui/animations";

interface LineageModalProps {
  initialData?: Lineage[] | null;
  onSubmit: (values: z.infer<typeof lineageSchema>[]) => void;
  onClose: () => void;
  isLoading?: boolean;
}

interface HierarchyLevel {
  level: number;
  position_id: number | null;
}

interface Position {
  id: number;
  name: string;
}

export default function LineageCreateModal({
  onSubmit,
  onClose,
  isLoading = false,
}: LineageModalProps) {
  const { lineages, fetchLineages } = useLineage();
  const [name, setName] = useState<string>("");
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyLevel[]>([]);
  const [showAddButton, setShowAddButton] = useState<boolean>(true);
  const [remainingPositions, setRemainingPositions] = useState<Position[]>([]);

  useEffect(() => {
    async function fetchPositions() {
      try {
        const positions = await import("@/lib/api/company").then((module) =>
          module.getPositions()
        );
        setAllPositions(positions);
      } catch (error) {
        console.error(error);
      }
    }

    fetchPositions();
  }, []);

  useEffect(() => {
    fetchLineages();
  }, [fetchLineages]);

  const getAvailablePositions = (levelIndex: number) => {
    // Get all position IDs that have been selected in previous levels
    const selectedPositionIds = hierarchy
      .slice(0, levelIndex)
      .map((item) => item.position_id)
      .filter(Boolean) as number[];

    return remainingPositions.filter(
      (position) => !selectedPositionIds.includes(position.id)
    );
  };

  const handlePositionChange = (levelIndex: number, position_id: number) => {
    setHierarchy((prev) => {
      // Create new array with all positions
      const newHierarchy = [...prev];

      // Nullify any previous occurrence of this position_id
      newHierarchy.forEach((level, index) => {
        if (level.position_id === position_id && index !== levelIndex) {
          newHierarchy[index] = { ...level, position_id: null };
        }
      });

      // Update the current level
      newHierarchy[levelIndex] = { ...newHierarchy[levelIndex], position_id };

      return newHierarchy;
    });
  };

  const removeLevel = (levelIndex: number) => {
    setHierarchy((prev) => {
      // Create a new array without the level we're removing
      const newHierarchy = prev.filter((_, index) => index !== levelIndex);

      // Reassign level numbers to maintain proper ordering
      return newHierarchy.map((level, index) => ({
        ...level,
        level: index + 1,
      }));
    });
  };

  const addNewLevel = () => {
    setHierarchy((prev) => {
      const selectedPositionIds = prev
        .map((l) => l.position_id)
        .filter(Boolean) as number[];
      const remainingPositionsNow = remainingPositions.filter(
        (p) => !selectedPositionIds.includes(p.id)
      );

      if (remainingPositionsNow.length > 0) {
        return [
          ...prev,
          { level: prev.length + 1, position_id: remainingPositionsNow[0].id },
        ];
      }
      return prev;
    });
  };

  const handleSave = () => {
    const lineageData = hierarchy
      .filter((level) => level.position_id !== null)
      .map((level) => ({
        position_id: level.position_id as number,
        hierarchical_level: level.level,
        name: name,
      }));

    if (lineageData.length > 0) {
      onSubmit(lineageData);
    }
  };

  useEffect(() => {
    setShowAddButton(remainingPositions.length > 0);
  }, [remainingPositions]);

  useEffect(() => {
    if (allPositions.length > 0) {
      const usedPositionIds = new Set(
        lineages.map((lineage: Lineage) => lineage.position_id)
      );
      const availablePositions = allPositions.filter(
        (pos) => !usedPositionIds.has(pos.id)
      );
      setRemainingPositions(availablePositions);

      // Initialize hierarchy with first available position if empty
      if (hierarchy.length === 0 && availablePositions.length > 0) {
        setHierarchy([{ level: 1, position_id: availablePositions[0].id }]);
      }
    }
  }, [lineages, allPositions, hierarchy]);

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  };

  useEffect(() => {
    console.log("Hierarchy: ", hierarchy);
    console.log(remainingPositions);
  }, [hierarchy, remainingPositions]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={modalVariants}
        className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-xl border border-blue-100"
      >
        <motion.div variants={fadeInUp} className="flex items-center gap-3">
          <Buildings size={24} weight="duotone" className="text-blue-600" />
          <h2 className="text-xl font-semibold text-blue-800">
            Create Lineage
          </h2>
        </motion.div>

        <motion.div variants={fadeInUp} className="mb-4">
          <label className="block font-semibold text-blue-800 mb-2">
            Lineage Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md bg-blue-50 p-2 border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none transition-all"
            placeholder="Enter Lineage Name"
          />
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="bg-white py-4 w-full max-w-4xl mx-auto"
        >
          <h3 className="text-md font-semibold text-blue-700 mb-4">
            Set Hierarchy
          </h3>

          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex flex-col w-full max-w-md pr-6">
              {allPositions.length > 0 &&
                hierarchy.map((level, index) => {
                  const availablePositions = getAvailablePositions(index);
                  return (
                    <motion.div
                      key={index}
                      className="relative mb-4"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* <div className="mb-1 text-sm text-blue-600 font-medium">
                        Level {level.level}
                      </div> */}
                      <div className="flex gap-2">
                        <select
                          value={
                            level.position_id === null ? "" : level.position_id
                          }
                          onChange={(e) =>
                            handlePositionChange(
                              index,
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full rounded-md bg-blue-50 px-4 py-2 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        >
                          <option>
                            Select position for Level {level.level}
                          </option>
                          {availablePositions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.name}
                            </option>
                          ))}
                        </select>
                        {index > 0 && (
                          <Button
                            onClick={() => removeLevel(index)}
                            variant="danger"
                            size="sm"
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                          >
                            <Trash size={16} weight="duotone" />
                          </Button>
                        )}
                      </div>
                      {index < hierarchy.length - 1 && (
                        <div className="flex justify-center">
                          <div className="h-6 w-0.5 bg-blue-300 absolute left-1/2 transform -translate-x-1/2"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              {showAddButton && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={addNewLevel}
                  className="mt-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus size={16} weight="bold" />
                  Add Level
                </Button>
              )}
            </div>
          </div>

          <motion.div variants={fadeIn} className="flex justify-end mt-8 gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isLoading}
              disabled={
                hierarchy.length === 0 ||
                !name ||
                isLoading ||
                hierarchy.some(
                  (level) =>
                    level.position_id === null ||
                    Number.isNaN(level.position_id)
                )
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function compareLineages(arr1: Lineage[], arr2: HierarchyLevel[]): boolean {
  // Check if arrays have different lengths
  if (arr1.length !== arr2.length) {
    return false;
  }

  // Compare each object's position_id AND hierarchical_level
  for (let i = 0; i < arr1.length; i++) {
    if (
      arr1[i].position_id !== arr2[i].position_id ||
      arr1[i].hierarchical_level !== arr2[i].level
    ) {
      return false;
    }
  }

  return true;
}

export function LineageUpdateModal({
  initialData,
  onSubmit,
  onClose,
  isLoading = false,
}: LineageModalProps) {
  const { lineages, fetchLineages } = useLineage();
  const [name, setName] = useState<string>("");
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyLevel[]>([]);
  const [showAddButton, setShowAddButton] = useState<boolean>(true);
  const [remainingPositions, setRemainingPositions] = useState<Position[]>([]);

  useEffect(() => {
    async function fetchPositions() {
      try {
        const positions = await import("@/lib/api/company").then((module) =>
          module.getPositions()
        );
        setAllPositions(positions);
      } catch (error) {
        console.error(error);
      }
    }

    fetchPositions();
  }, []);

  useEffect(() => {
    fetchLineages();
  }, [fetchLineages]);

  const getAvailablePositions = (levelIndex: number) => {
    const selectedPositionIds = hierarchy
      .slice(0, levelIndex)
      .map((item) => item.position_id)
      .filter(Boolean) as number[];

    // Include currently selected position in available options
    const currentPositionId = hierarchy[levelIndex]?.position_id;
    return remainingPositions.filter(
      (position) =>
        !selectedPositionIds.includes(position.id) ||
        position.id === currentPositionId
    );
  };

  const handlePositionChange = (levelIndex: number, position_id: number) => {
    setHierarchy((prev) => {
      // Create new array with all positions
      const newHierarchy = [...prev];

      // Nullify any previous occurrence of this position_id
      newHierarchy.forEach((level, index) => {
        if (level.position_id === position_id && index !== levelIndex) {
          newHierarchy[index] = { ...level, position_id: null };
        }
      });

      // Update the current level
      newHierarchy[levelIndex] = { ...newHierarchy[levelIndex], position_id };

      return newHierarchy;
    });
  };

  const removeLevel = (levelIndex: number) => {
    setHierarchy((prev) => {
      // Create a new array without the level we're removing
      const newHierarchy = prev.filter((_, index) => index !== levelIndex);

      // Reassign level numbers to maintain proper ordering
      return newHierarchy.map((level, index) => ({
        ...level,
        level: index + 1,
      }));
    });
  };

  const addNewLevel = () => {
    setHierarchy((prev) => {
      const selectedPositionIds = prev
        .map((l) => l.position_id)
        .filter(Boolean) as number[];
      const remainingPositionsNow = remainingPositions.filter(
        (p) => !selectedPositionIds.includes(p.id)
      );

      if (remainingPositionsNow.length > 0) {
        return [
          ...prev,
          { level: prev.length + 1, position_id: remainingPositionsNow[0].id },
        ];
      }
      return prev;
    });
  };
  const handleSave = () => {
    const lineageData = hierarchy
      .filter((level) => level.position_id !== null)
      .map((level) => ({
        position_id: level.position_id as number,
        hierarchical_level: level.level,
        name: name,
        company_id: 0,
      }));

    if (lineageData.length > 0) {
      onSubmit(lineageData);
    }
  };

  useEffect(() => {
    setShowAddButton(!(hierarchy.length === remainingPositions.length));
  }, [hierarchy, remainingPositions]);

  useEffect(() => {
    if (allPositions.length > 0) {
      const usedPositionIds = new Set(
        lineages
          .filter(
            (l: Lineage) =>
              !initialData?.some((i) => i.position_id === l.position_id)
          )
          .map((l: Lineage) => l.position_id)
      );
      const availablePositions = allPositions.filter(
        (pos) => !usedPositionIds.has(pos.id)
      );
      setRemainingPositions(availablePositions);
    }
  }, [lineages, allPositions, initialData]);
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setName(initialData[0].name);
      setHierarchy(
        initialData.map((level) => {
          return {
            level: level.hierarchical_level,
            position_id: level.position_id,
          };
        })
      );
    }
  }, [initialData]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 shadow-xl border border-blue-100"
      >
        <motion.div variants={fadeInUp} className="flex items-center gap-3">
          <Buildings size={24} weight="duotone" className="text-blue-600" />
          <h2 className="text-xl font-semibold text-blue-800">Edit Lineage</h2>
        </motion.div>

        <motion.div variants={fadeInUp} className="mb-4">
          <label className="block font-semibold text-blue-800 mb-2">
            Lineage Name
          </label>
          <input
            type="text"
            value={name}
            readOnly
            className="w-full rounded-md bg-blue-50 p-2 border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none transition-all cursor-not-allowed"
            placeholder="Enter Lineage Name"
          />
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="bg-white py-4 w-full max-w-4xl mx-auto"
        >
          <h3 className="text-md font-semibold text-blue-700 mb-4">
            Update Hierarchy
          </h3>

          <div className="flex flex-col items-center justify-center w-full">
            <div className="flex flex-col w-full max-w-md pr-6">
              {allPositions.length > 0 &&
                hierarchy.map((level, index) => {
                  const availablePositions = getAvailablePositions(index);
                  return (
                    <motion.div
                      key={index}
                      className="relative mb-4"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {/* <div className="mb-1 text-sm text-blue-600 font-medium">
                        Level {level.level}
                      </div> */}
                      <div className="flex gap-2">
                        <select
                          value={
                            level.position_id === null ? "" : level.position_id
                          }
                          onChange={(e) =>
                            handlePositionChange(
                              index,
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full rounded-md bg-blue-50 px-4 py-2 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                        >
                          <option>
                            Select position for Level {level.level}
                          </option>
                          {availablePositions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.name}
                            </option>
                          ))}
                        </select>
                        {index > 0 && (
                          <Button
                            onClick={() => removeLevel(index)}
                            variant="danger"
                            size="sm"
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                          >
                            <Trash size={16} weight="duotone" />
                          </Button>
                        )}
                      </div>
                      {index < hierarchy.length - 1 && (
                        <div className="flex justify-center">
                          <div className="h-6 w-0.5 bg-blue-300 absolute left-1/2 transform -translate-x-1/2"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              {showAddButton && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={addNewLevel}
                  className="mt-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus size={16} weight="bold" />
                  Add Level
                </Button>
              )}
            </div>
          </div>

          <motion.div variants={fadeIn} className="flex justify-end mt-8 gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isLoading}
              disabled={
                hierarchy.length === 0 ||
                !name ||
                isLoading ||
                hierarchy.some(
                  (level) =>
                    level.position_id === null ||
                    Number.isNaN(level.position_id)
                ) ||
                !!(
                  initialData &&
                  initialData.length > 0 &&
                  name === initialData[0].name &&
                  compareLineages(initialData, hierarchy)
                )
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
