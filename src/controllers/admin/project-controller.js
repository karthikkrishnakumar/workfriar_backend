import ProjectRepository from "../../repositories/admin/project-repository.js";
import AddProjectRequest from "../../requests/admin/add-project-request.js";
import UpdateProjectRequest from "../../requests/admin/update-project-request.js";
import ProjectResponse from "../../responses/project-response.js";
import uploadFile from "../../utils/uploadFile.js";
import deleteFile from "../../utils/deleteFile.js";

const projectRepo = new ProjectRepository();

export default class ProjectController {
  /**
   * Add Project
   *
   * @swagger
   * /project/add:
   *   post:
   *     tags:
   *       - Project
   *     summary: Add project
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               clientName:
   *                 type: string
   *                 description: Enter client name
   *               projectName:
   *                 type: string
   *                 description: Enter project name
   *               description:
   *                 type: string
   *                 description: Enter project description
   *               plannedStartDate:
   *                 type: string
   *                 format: date
   *                 description: Enter planned start date
   *               plannedEndDate:
   *                 type: string
   *                 format: date
   *                 description: Enter planned end date
   *               projectLead:
   *                 type: string
   *                 description: Enter project lead user id
   *               billingModel:
   *                 type: string
   *                 description: Enter billing model
   *               projectLogo:
   *                 type: string
   *                 format: binary
   *                 description: Upload project logo
   *               openForTimeEntry:
   *                 type: string
   *                 description: Enter time entry status (opened/closed)
   *               status:
   *                 type: string
   *                 description: Enter project status
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Bad Request
   *       500:
   *         description: Internal Server Error
   */
  async addProject(req, res) {
    try {
      const validatedData = await new AddProjectRequest(req).validate();

      // Handle file upload if present
      for (const fieldName in req.files) {
        if (Object.hasOwnProperty.call(req.files, fieldName)) {
          const fileArray = req.files[fieldName];
          for (const file of fileArray) {
            const folderName = "projects";
            const uploadedFile = await uploadFile(file, folderName);
            if (uploadedFile.path) {
              req.body.projectLogo = uploadedFile.path;
            }
          }
        }
      }

      if (validatedData.projectLogo != undefined) {
        validatedData.projectLogo = req.body.projectLogo;
      }

      const projectDetails = await projectRepo.addProject(validatedData);

      if (projectDetails) {
        const projectData = await ProjectResponse.format(projectDetails);

        res.status(200).json({
          status: true,
          message: "Project added successfully.",
          data: projectData,
        });
      } else {
        res.status(422).json({
          status: false,
          message: "Failed to add project.",
          data: [],
        });
      }
    } catch (error) {
      res.status(422).json({
        status: false,
        message: "Failed to add project.",
        errors: error,
      });
    }
  }
  /**
   * Get All Projects
   *
   * @swagger
   * /project/list:
   *   post:
   *     tags:
   *       - Project
   *     summary: Get all projects
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               page:
   *                 type: integer
   *                 description: Page number
   *               limit:
   *                 type: integer
   *                 description: Number of items per page
   *               status:
   *                 type: string
   *                 description: Filter by status
   *               clientName:
   *                 type: string
   *                 description: Filter by client name
   *               projectName:
   *                 type: string
   *                 description: Filter by project name
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Bad Request
   *       500:
   *         description: Internal Server Error
   */
  async getAllProjects(req, res) {
    try {
      const options = {
        page: parseInt(req.body.page) || 1,
        limit: parseInt(req.body.limit) || 10,
      };

      // Get filters from request body
      const filters = {
        status: req.body.status,
        clientName: req.body.clientName,
        projectName: req.body.projectName,
      };

      const projects = await projectRepo.getAllProjects(options, filters);

      const formattedProjects = await Promise.all(
        projects.docs.map(
          async (project) => await ProjectResponse.format(project)
        )
      );

      res.status(200).json({
        status: true,
        message: "Projects retrieved successfully.",
        data: {
          projects: formattedProjects,
          pagination: {
            total: projects.total,
            page: projects.page,
            pages: projects.pages,
            limit: projects.limit,
          },
        },
      });
    } catch (error) {
      console.error("Error in getAllProjects:", error); // Log the error
      res.status(500).json({
        status: false,
        message: "Failed to retrieve projects.",
        errors: error.message || error, // Add error message for easier debugging
      });
    }
  }

  /**
   * Get Project By Id
   *
   * @swagger
   * /project/get/{id}:
   *   post:
   *     tags:
   *       - Project
   *     summary: Get project by id
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 description: Filter by status
   *     responses:
   *       200:
   *         description: Success
   *       404:
   *         description: Not Found
   *       500:
   *         description: Internal Server Error
   */
  async getProjectById(req, res) {
    try {
      const filters = {
        status: req.body.status,
      };

      const project = await projectRepo.getProjectById(req.params.id, filters);

      if (!project) {
        return res.status(404).json({
          status: false,
          message: "Project not found.",
          data: null,
        });
      }

      const projectData = await ProjectResponse.format(project);

      res.status(200).json({
        status: true,
        message: "Project retrieved successfully.",
        data: projectData,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Failed to retrieve project.",
        errors: error,
      });
    }
  }

  /**
   * Update Project
   *
   * @swagger
   * /project/update/{id}:
   *   put:
   *     tags:
   *       - Project
   *     summary: Update project
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               clientName:
   *                 type: string
   *                 description: Enter client name
   *               projectName:
   *                 type: string
   *                 description: Enter project name
   *               description:
   *                 type: string
   *                 description: Enter project description
   *               plannedStartDate:
   *                 type: string
   *                 format: date
   *                 description: Enter planned start date
   *               plannedEndDate:
   *                 type: string
   *                 format: date
   *                 description: Enter planned end date
   *               projectLead:
   *                 type: string
   *                 description: Enter project lead user id
   *               billingModel:
   *                 type: string
   *                 description: Enter billing model
   *               projectLogo:
   *                 type: string
   *                 format: binary
   *                 description: Upload project logo
   *               openForTimeEntry:
   *                 type: string
   *                 description: Enter time entry status (opened/closed)
   *               status:
   *                 type: string
   *                 description: Enter project status
   *     responses:
   *       200:
   *         description: Success
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Not Found
   *       500:
   *         description: Internal Server Error
   */
  async updateProject(req, res) {
    try {
      const validatedData = await new UpdateProjectRequest(req).validate();

      // Handle file upload if present
      if (req.files && Object.keys(req.files).length > 0) {
        for (const fieldName in req.files) {
          if (Object.hasOwnProperty.call(req.files, fieldName)) {
            const fileArray = req.files[fieldName];
            for (const file of fileArray) {
              const folderName = "projects";
              const uploadedFile = await uploadFile(file, folderName);
              if (uploadedFile.path) {
                // Delete old logo if exists
                const oldProject = await projectRepo.getProjectById(
                  req.params.id
                );
                if (oldProject.projectLogo) {
                  await deleteFile(oldProject.projectLogo);
                }
                validatedData.projectLogo = uploadedFile.path;
              }
            }
          }
        }
      }

      delete validatedData.projectId; // Remove projectId from update data

      const projectDetails = await projectRepo.updateProject(
        req.params.id,
        validatedData
      );

      if (projectDetails) {
        const projectData = await ProjectResponse.format(projectDetails);


        res.status(200).json({
          status: true,
          message: "Project updated successfully.",
          data: projectData,
        });
      } else {
        res.status(404).json({
          status: false,
          message: "Project not found.",
          data: null,
        });
      }
    } catch (error) {
        console.error("Error in updateProject:", error);
      res.status(422).json({
        status: false,
        message: "Failed to update project.",
        errors: error,
      });
    }
  }

  /**
   * Delete Project
   *
   * @swagger
   * /project/delete/{id}:
   *   delete:
   *     tags:
   *       - Project
   *     summary: Delete project
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Project ID
   *     responses:
   *       200:
   *         description: Success
   *       404:
   *         description: Not Found
   *       500:
   *         description: Internal Server Error
   */
  async deleteProject(req, res) {
    try {
      const project = await projectRepo.getProjectById(req.params.id);

      if (!project) {
        return res.status(404).json({
          status: false,
          message: "Project not found.",
          data: null,
        });
      }

      // Delete project logo if exists
      if (project.projectLogo) {
        await deleteFile(project.projectLogo);
      }

      await projectRepo.deleteProject(req.params.id);


      res.status(200).json({
        status: true,
        message: "Project deleted successfully.",
        data: null,
      });
    } catch (error) {
        console.log("Error in deleteProject:", error);
      res.status(500).json({
        status: false,
        message: "Failed to delete project.",
        errors: error,
      });
    }
  }
}
