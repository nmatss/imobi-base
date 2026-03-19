/**
 * Property Inspections (Vistorias) Routes
 * Digital inspection system for move-in/move-out property inspections
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";
import { asyncHandler, BadRequestError, NotFoundError } from "./middleware/error-handler";
import {
  getDefaultRooms,
  getDefaultItems,
  estimateRepairCost,
  compareInspections,
  generateInspectionReport,
  getTemplates,
} from "./services/inspection-service";

export function registerInspectionRoutes(app: Express) {
  // Apply auth to all inspection routes
  app.use("/api/inspections", requireAuth);

  /**
   * GET /api/inspections/templates
   * Get available room/item templates
   */
  app.get(
    "/api/inspections/templates",
    asyncHandler(async (req: Request, res: Response) => {
      const templates = getTemplates();
      res.json(templates);
    })
  );

  /**
   * GET /api/inspections
   * List inspections with optional filters
   */
  app.get(
    "/api/inspections",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const { propertyId, type, status } = req.query;

      const inspections = await storage.getPropertyInspectionsByTenant(tenantId, {
        propertyId: propertyId as string,
        type: type as string,
        status: status as string,
      });

      res.json(inspections);
    })
  );

  /**
   * GET /api/inspections/:id
   * Get full inspection with rooms and items
   */
  app.get(
    "/api/inspections/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      // Load rooms and items
      const rooms = await storage.getInspectionRoomsByInspection(inspection.id);
      const roomsWithItems = await Promise.all(
        rooms.map(async (room) => {
          const items = await storage.getInspectionItemsByRoom(room.id);
          return { room, items };
        })
      );

      res.json({ ...inspection, rooms: roomsWithItems });
    })
  );

  /**
   * POST /api/inspections
   * Create new inspection with default rooms/items from template
   */
  app.post(
    "/api/inspections",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const { propertyId, rentalContractId, type, inspectorName, renterName, renterId, scheduledDate, propertyType, previousInspectionId } = req.body;

      if (!propertyId || !type || !inspectorName) {
        throw new BadRequestError("propertyId, type, and inspectorName are required");
      }

      // Create the inspection
      const inspection = await storage.createPropertyInspection({
        tenantId,
        propertyId,
        rentalContractId: rentalContractId || null,
        type,
        status: "in_progress",
        inspectorName,
        inspectorId: req.user!.id,
        renterName: renterName || null,
        renterId: renterId || null,
        scheduledDate: scheduledDate || null,
        previousInspectionId: previousInspectionId || null,
      });

      // Get default rooms for property type
      const defaultRooms = getDefaultRooms(propertyType || "apartment");

      // Create rooms and items
      const roomsWithItems = [];
      for (let i = 0; i < defaultRooms.length; i++) {
        const roomTemplate = defaultRooms[i];
        const room = await storage.createInspectionRoom({
          inspectionId: inspection.id,
          roomType: roomTemplate.type,
          roomLabel: roomTemplate.label,
          order: i,
        });

        const items = [];
        for (let j = 0; j < roomTemplate.items.length; j++) {
          const item = await storage.createInspectionItem({
            roomId: room.id,
            itemName: roomTemplate.items[j],
            condition: "good",
            order: j,
          });
          items.push(item);
        }

        roomsWithItems.push({ room, items });
      }

      // If this is an exit inspection with a previous entry, populate previous conditions
      if (type === "exit" && previousInspectionId) {
        const entryRooms = await storage.getInspectionRoomsByInspection(previousInspectionId);
        for (const exitRoomData of roomsWithItems) {
          const entryRoom = entryRooms.find(
            (er) => er.roomType === exitRoomData.room.roomType
          );
          if (entryRoom) {
            const entryItems = await storage.getInspectionItemsByRoom(entryRoom.id);
            for (const exitItem of exitRoomData.items) {
              const entryItem = entryItems.find((ei) => ei.itemName === exitItem.itemName);
              if (entryItem) {
                await storage.updateInspectionItem(exitItem.id, {
                  previousCondition: entryItem.condition,
                });
                exitItem.previousCondition = entryItem.condition;
              }
            }
          }
        }
      }

      res.status(201).json({ ...inspection, rooms: roomsWithItems });
    })
  );

  /**
   * PUT /api/inspections/:id
   * Update inspection metadata
   */
  app.put(
    "/api/inspections/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      const updated = await storage.updatePropertyInspection(req.params.id, req.body);
      res.json(updated);
    })
  );

  /**
   * DELETE /api/inspections/:id
   * Delete inspection (only if in_progress)
   */
  app.delete(
    "/api/inspections/:id",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      if (inspection.status !== "in_progress") {
        throw new BadRequestError("Only in-progress inspections can be deleted");
      }

      await storage.deletePropertyInspection(req.params.id);
      res.json({ success: true });
    })
  );

  /**
   * POST /api/inspections/:id/rooms
   * Add room to inspection
   */
  app.post(
    "/api/inspections/:id/rooms",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      const { roomType, roomLabel, order } = req.body;
      if (!roomType || !roomLabel) {
        throw new BadRequestError("roomType and roomLabel are required");
      }

      const room = await storage.createInspectionRoom({
        inspectionId: inspection.id,
        roomType,
        roomLabel,
        order: order || 0,
      });

      // Create default items for this room type
      const defaultItems = getDefaultItems(roomType);
      const items = [];
      for (let i = 0; i < defaultItems.length; i++) {
        const item = await storage.createInspectionItem({
          roomId: room.id,
          itemName: defaultItems[i],
          condition: "good",
          order: i,
        });
        items.push(item);
      }

      res.status(201).json({ room, items });
    })
  );

  /**
   * PUT /api/inspections/:id/rooms/:roomId
   * Update room
   */
  app.put(
    "/api/inspections/:id/rooms/:roomId",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      const updated = await storage.updateInspectionRoom(req.params.roomId, req.body);
      if (!updated) {
        throw new NotFoundError("Room");
      }

      res.json(updated);
    })
  );

  /**
   * DELETE /api/inspections/:id/rooms/:roomId
   * Delete room and its items
   */
  app.delete(
    "/api/inspections/:id/rooms/:roomId",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      await storage.deleteInspectionRoom(req.params.roomId);
      res.json({ success: true });
    })
  );

  /**
   * POST /api/inspections/:id/rooms/:roomId/items
   * Add item to room
   */
  app.post(
    "/api/inspections/:id/rooms/:roomId/items",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      const { itemName, order } = req.body;
      if (!itemName) {
        throw new BadRequestError("itemName is required");
      }

      const item = await storage.createInspectionItem({
        roomId: req.params.roomId,
        itemName,
        condition: "good",
        order: order || 0,
      });

      res.status(201).json(item);
    })
  );

  /**
   * PUT /api/inspections/:id/rooms/:roomId/items/:itemId
   * Update item condition/photos/damage
   */
  app.put(
    "/api/inspections/:id/rooms/:roomId/items/:itemId",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      const updateData = { ...req.body };

      // Auto-calculate repair cost if damage is marked and condition is fair/poor
      if (updateData.hasDamage && updateData.condition) {
        const item = await storage.getInspectionItem(req.params.itemId);
        if (item && !updateData.estimatedRepairCost) {
          updateData.estimatedRepairCost = estimateRepairCost(
            item.itemName,
            updateData.condition
          );
        }
      }

      const updated = await storage.updateInspectionItem(req.params.itemId, updateData);
      if (!updated) {
        throw new NotFoundError("Item");
      }

      res.json(updated);
    })
  );

  /**
   * POST /api/inspections/:id/complete
   * Mark inspection as completed, calculate totals
   */
  app.post(
    "/api/inspections/:id/complete",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      if (inspection.status !== "in_progress") {
        throw new BadRequestError("Inspection is already completed or signed");
      }

      // Calculate total damages
      const rooms = await storage.getInspectionRoomsByInspection(inspection.id);
      let totalDamages = 0;
      let conditionCounts: Record<string, number> = { excellent: 0, good: 0, fair: 0, poor: 0 };

      for (const room of rooms) {
        const items = await storage.getInspectionItemsByRoom(room.id);
        for (const item of items) {
          if (item.hasDamage && item.estimatedRepairCost) {
            totalDamages += item.estimatedRepairCost;
          }
          if (item.condition && item.condition !== "not_applicable") {
            conditionCounts[item.condition] = (conditionCounts[item.condition] || 0) + 1;
          }
        }
      }

      // Determine overall condition
      const totalItems = Object.values(conditionCounts).reduce((a, b) => a + b, 0);
      let overallCondition = "good";
      if (totalItems > 0) {
        if (conditionCounts.poor > totalItems * 0.3) overallCondition = "poor";
        else if (conditionCounts.fair > totalItems * 0.3) overallCondition = "fair";
        else if (conditionCounts.excellent > totalItems * 0.5) overallCondition = "excellent";
      }

      const updated = await storage.updatePropertyInspection(inspection.id, {
        status: "completed",
        completedDate: new Date().toISOString(),
        totalDamages,
        overallCondition,
        generalNotes: req.body.generalNotes || inspection.generalNotes,
      });

      res.json(updated);
    })
  );

  /**
   * POST /api/inspections/:id/sign
   * Add signature (inspector or renter)
   */
  app.post(
    "/api/inspections/:id/sign",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      if (inspection.status === "in_progress") {
        throw new BadRequestError("Inspection must be completed before signing");
      }

      const { signatureType, signatureData } = req.body;
      if (!signatureType || !signatureData) {
        throw new BadRequestError("signatureType and signatureData are required");
      }

      const updateData: any = {};
      if (signatureType === "inspector") {
        updateData.inspectorSignature = signatureData;
      } else if (signatureType === "renter") {
        updateData.renterSignature = signatureData;
      } else {
        throw new BadRequestError("signatureType must be 'inspector' or 'renter'");
      }

      // Check if both signatures are now present
      const currentInspection = await storage.getPropertyInspection(inspection.id);
      const hasInspectorSig = signatureType === "inspector" ? true : !!currentInspection?.inspectorSignature;
      const hasRenterSig = signatureType === "renter" ? true : !!currentInspection?.renterSignature;

      if (hasInspectorSig && hasRenterSig) {
        updateData.status = "signed";
        updateData.signedAt = new Date().toISOString();
      }

      const updated = await storage.updatePropertyInspection(inspection.id, updateData);
      res.json(updated);
    })
  );

  /**
   * GET /api/inspections/:id/compare
   * Compare with entry inspection (for exit inspections)
   */
  app.get(
    "/api/inspections/:id/compare",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      if (!inspection.previousInspectionId) {
        throw new BadRequestError("No previous inspection linked for comparison");
      }

      const entryInspection = await storage.getPropertyInspection(inspection.previousInspectionId);
      if (!entryInspection) {
        throw new NotFoundError("Entry inspection");
      }

      // Load both inspections' rooms and items
      const loadRooms = async (inspId: string) => {
        const rooms = await storage.getInspectionRoomsByInspection(inspId);
        return Promise.all(
          rooms.map(async (room) => ({
            room,
            items: await storage.getInspectionItemsByRoom(room.id),
          }))
        );
      };

      const entryRooms = await loadRooms(entryInspection.id);
      const exitRooms = await loadRooms(inspection.id);

      const comparison = compareInspections(entryRooms, exitRooms, entryInspection, inspection);
      res.json(comparison);
    })
  );

  /**
   * GET /api/inspections/:id/report
   * Generate HTML report
   */
  app.get(
    "/api/inspections/:id/report",
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user!.tenantId;
      const inspection = await storage.getPropertyInspection(req.params.id);

      if (!inspection || inspection.tenantId !== tenantId) {
        throw new NotFoundError("Inspection");
      }

      // Load property
      const property = await storage.getProperty(inspection.propertyId);

      // Load rooms and items
      const rooms = await storage.getInspectionRoomsByInspection(inspection.id);
      const roomsWithItems = await Promise.all(
        rooms.map(async (room) => ({
          room,
          items: await storage.getInspectionItemsByRoom(room.id),
        }))
      );

      // Load comparison if exit inspection
      let comparison;
      if (inspection.previousInspectionId) {
        try {
          const entryInspection = await storage.getPropertyInspection(inspection.previousInspectionId);
          if (entryInspection) {
            const entryRooms = await storage.getInspectionRoomsByInspection(entryInspection.id);
            const entryRoomsWithItems = await Promise.all(
              entryRooms.map(async (room) => ({
                room,
                items: await storage.getInspectionItemsByRoom(room.id),
              }))
            );
            comparison = compareInspections(entryRoomsWithItems, roomsWithItems, entryInspection, inspection);
          }
        } catch (e) {
          // Ignore comparison errors
        }
      }

      const html = generateInspectionReport(inspection, roomsWithItems, property, comparison);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    })
  );
}
