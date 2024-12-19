import ProjectStatusReport from "../../models/admin/project-status-report.js";
import Project from "../../models/projects.js";
import User from "../../models/user.js";

export default class ProjectStatusReportRepository {
  async addReport(reportData) {
    try {
      const report = new ProjectStatusReport(reportData);
      return await report.save();
    } catch (error) {
      throw new Error(`Failed to add report: ${error.message}`);
    }
  }

  async getAllReports({ page = 1, limit = 10 } = {}) {
    try {
      const skip = (page - 1) * limit;
      const reports = await ProjectStatusReport.find()
        .populate({
          path: "project_name",
          select: "project_name -_id",
        })
        .populate({
          path: "project_lead",
          select: "full_name -_id",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalCount = await ProjectStatusReport.countDocuments();

      return { reports, totalCount };
    } catch (error) {
      throw new Error(`Failed to get reports: ${error.message}`);
    }
  }

  async getReportById(reportId) {
    try {
      const report = await ProjectStatusReport.findById(reportId)
        .populate({
          path: "project_name",
          select: "project_name",
        })
        .populate({
          path: "project_lead",
          select: "full_name",
        });
      if (!report) {
        throw new Error(`Report with ID ${reportId} not found`);
      }
      return report;
    } catch (error) {
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  async updateReport(reportId, reportData) {
    try {
      const report = await ProjectStatusReport.findByIdAndUpdate(
        reportId,
        reportData,
        { new: true }
      )
        .populate({
          path: "project_name",
          select: "project_name -_id",
        })
        .populate({
          path: "project_lead",
          select: "full_name -_id",
        });

      if (!report) {
        throw new Error(`Report with ID ${reportId} not found`);
      }
      return report;
    } catch (error) {
      throw new Error(`Failed to update report: ${error.message}`);
    }
  }
  /**
   * Get dropdown data for either projects or project leads
   * @param {string} type - Type of dropdown data ('projects' or 'leads')
   * @returns {Promise<Array>} List of items with id and name
   */
  async getDropdownData(type) {
    try {
      const config = {
        projects: {
          model: Project,
          fields: "project_name _id",
          nameField: "project_name",
        },
        leads: {
          model: User,
          fields: "full_name _id",
          nameField: "full_name",
        },
      };

      const { model, fields, nameField } = config[type];

      const items = await model.find({}, fields).sort({ [nameField]: 1 }); // Sort alphabetically

      return items.map((item) => ({
        id: item._id,
        name: item[nameField],
      }));
    } catch (error) {
      throw new Error(`Failed to retrieve ${type}: ${error.message}`);
    }
  }
}
