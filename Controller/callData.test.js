// @ts-nocheck
import { saveCallData, getAllCalls } from "./callData.js";
import CallModel from "../models/callData.js";

// Mock Mongoose model
jest.mock("../models/callData.js");

describe("callData controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveCallData", () => {
    it("doit enregistrer un appel valide", async () => {
      const fakeData = {
        nom: "Dupont",
        telephone: "0606060606",
        type_demande: "Info",
        description: "Test description",
      };

      // Mock save() pour renvoyer un document simulé
      CallModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({
          ...fakeData,
          date: expect.any(Date),
          _id: "123abc",
        }),
      }));

      const result = await saveCallData(fakeData);

      expect(result.nom).toBe("Dupont");
      expect(result.telephone).toBe("0606060606");
      expect(result.type_demande).toBe("Info");
      expect(result.description).toBe("Test description");
      expect(result.date).toBeInstanceOf(Date);
    });

    it("doit lever une erreur si nom ou type_demande manquant", async () => {
      await expect(saveCallData({})).rejects.toThrow(
        "Nom et type_demande sont obligatoires."
      );
    });

    it("doit lever une erreur propre si save échoue", async () => {
      CallModel.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error("DB error")),
      }));

      await expect(
        saveCallData({
          nom: "Dupont",
          type_demande: "Info",
        })
      ).rejects.toThrow("Impossible d'enregistrer l'appel en base.");
    });
  });

  describe("getAllCalls", () => {
    it("doit renvoyer la liste des appels triés", async () => {
      const fakeCalls = [
        { nom: "A", date: new Date("2025-01-01") },
        { nom: "B", date: new Date("2025-02-01") },
      ];

      // Mock find().sort() avec chaîne de mocks
      const sortMock = jest.fn().mockResolvedValue(fakeCalls);
      CallModel.find.mockReturnValue({ sort: sortMock });

      // Mock res.json
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllCalls({}, res);

      expect(CallModel.find).toHaveBeenCalled();
      expect(sortMock).toHaveBeenCalledWith({ date: -1 });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeCalls });
    });

    it("doit gérer une erreur lors de la récupération", async () => {
      const sortMock = jest.fn().mockRejectedValue(new Error("DB fail"));
      CallModel.find.mockReturnValue({ sort: sortMock });

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllCalls({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Erreur serveur." });
    });
  });
});
