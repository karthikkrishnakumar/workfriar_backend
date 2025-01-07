import RoleRepository from "../../repositories/admin/role-repository.js"
import ProjectTeamRepository from "../../repositories/admin/project-team-repository.js"
import ProjectRepository from "../../repositories/admin/project-repository.js"
import RejectionNotesRepository from "../../repositories/admin/rejection-notes-repository.js"
import TimesheetRepository from "../../repositories/admin/timesheet-repository.js"
import TeamMembersResponse from "../../responses/team-members-reponse.js"
import ManageTimesheetRequest from "../../requests/admin/manage-timesheet-request.js"
import UserRepository from "../../repositories/user-repository.js"
import NotificationController from "../notification-controller.js"
import { CustomValidationError } from "../../exceptions/custom-validation-error.js"

const projectTeamrepo=new ProjectTeamRepository()
const projectRepo=new ProjectRepository()
const timesheetrepo=new TimesheetRepository()
const teammemberResponse=new TeamMembersResponse()
const rejectRepo=new RejectionNotesRepository()
const notification=new NotificationController()
const managetimesheetRequest=new ManageTimesheetRequest()
const userRepository=new UserRepository()

class TimesheetApprovalController 
{
/**
 * @swagger
 * /admin/approvalcenter:
 *   post:
 *     summary: Get members based on user role
 *     description: Retrieves a list of members based on the user's role. Different roles have access to different sets of members.
 *     tags: [TimeSheet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 description: Page number for pagination
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 description: Number of items per page
 *                 default: 10
 *     responses:
 *       200:
 *         description: Successfully retrieved members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Members fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       projectTeam:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             _id:
 *                               type: string
 *                               example: "60d5ecb54b24a1a8c8c3e111"
 *                             name:
 *                               type: string
 *                               example: "John Doe"
 *                             email:
 *                               type: string
 *                               example: "john.doe@example.com"
 *                             role:
 *                               type: string
 *                               example: "Developer"
 *                       project:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d5ecb54b24a1a8c8c3e222"
 *                           name:
 *                             type: string
 *                             example: "Project Alpha"
 *       400:
 *         description: Bad request or no timesheets for review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "No Timesheets for Review"
 *                 data:
 *                   type: array
 *                   items: {}
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 *                 data:
 *                   type: array
 *                   items: {}
 */

    async getMembers(req,res)
    {
        try
        {
            const {page=1,limit=10}=req.body
            const pageNumber = parseInt(page,10);
            const limitNumber = parseInt(limit, 10);
            const skip=(pageNumber-1)*limitNumber
            let userId= req.session?.user?.id //get from Token
            const userRole=await RoleRepository.getRoleByUserId(userId)
            if(userRole.role==="Team Lead")
            {
                const projects=await  projectRepo.getProjectsByProjectLead(userId)

                const data = await Promise.all(
                    projects.map(async (item) => {
                        return {
                            projectTeam: await projectTeamrepo.getProjectTeamExpandedByProjectId(item._id, skip, limitNumber),
                            project: await projectRepo.getProjectById(item._id),
                        };
                    })
                ); 
                const formattedData=await teammemberResponse.formatTeammembers(data)
                return res.status(200).json({
                    status:true,
                    message:"Project Team fetched successfully",
                    data:formattedData
                })
            }
            else if(userRole.role==="Project Manager" || userRole.role==="Technichal Lead")
            {
                const teamLeads=await RoleRepository.getTeamLeads(skip,limitNumber)
                const formattedData=await teammemberResponse.formatTeamLeads(teamLeads)
                return res.status(200).json({
                    status:true,
                    message:"Team Leads fetched successfully",
                    data:formattedData
                })
            }
            else
            {
                return res.status(400).json({
                    status:true,
                    message:"No Timesheets for Review",
                    data:[]
                })
            }

        }
        catch(error)
        {
            return res.status(500).json(
                {status:false,
                message:error.message,
                data:[]
            })
        }
    }
/**
 * @swagger
 * /admin/managetimesheet:
 *   post:
 *     summary: Updates the status of a timesheet.
 *     tags: [TimeSheet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timesheetid:
 *                 type: string
 *                 description: The ID of the timesheet to be updated.
 *                 example: "12345"
 *               state:
 *                 type: string
 *                 description: The new state of the timesheet.
 *                 example: "approved"
 *     responses:
 *       200:
 *         description: Timesheet status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Timesheet Status updated successfully"
 *                 data:
 *                   type: object
 *                   description: The updated timesheet details.
 *       400:
 *         description: Timesheet status not updated due to a bad request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Timesheet Status not updated"
 *                 data:
 *                   type: object
 *                   description: Additional error information.
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
    async manageTimeSheet(req,res)
    {
        let userId= req.session?.user?.id//id comes from token
        const {timesheetid,state}=req.body
        try
        {
            const user=await userRepository.getUserById(userId)
            const {timesheet,status}=await timesheetrepo.updateTimesheetStatus(timesheetid,state)
            if(status)
            {
                await notification.createNotification(timesheet.user_id,`Timesheet  has been ${timesheet.status} by ${user.full_name}`,"info")
                return res.status(200).json({
                    status:true,
                    message:"Timesheet Status updated successfully",
                    data:timesheet
                })
            }
            else
            {
                return res.status(400).json({
                    status:true,
                    message:"Timesheet Status not updated",
                    data:data
                })
            }
        }
        catch(error)
        {
            return res.status(500).json(
                {
                status:false,
                message:error.message,
                data:[]
            })
        }
    }

    /**
 * @swagger
 * /admin/manage-all-timesheet:
 *   post:
 *     summary: Manage timesheet statuses (approve or reject).
 *     description: Updates the status of timesheets for a user within a specific week. Handles approval or rejection and manages any related rejection records.
 *     tags: [TimeSheet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timesheetid:
 *                 type: string
 *                 description: The ID of the timesheet to manage.
 *                 example: "63f1e9f9a6a3bca97e8b4567"
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: The new status for the timesheet.
 *                 example: "approved"
 *               userid:
 *                 type: string
 *                 description: The user ID associated with the timesheet.
 *                 example: "63f1e9f9a6a3bca97e8b1234"
 *               notes:
 *                 type: string
 *                 description: Notes explaining the rejection (required if status is "rejected").
 *                 example: "Timesheet contains incomplete data."
 *     responses:
 *       200:
 *         description: Timesheet status updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Whether the request was successful.
 *                   example: true
 *                 message:
 *                   type: string
 *                   description: Success message.
 *                   example: "Timesheet Status updated successfully"
 *                 data:
 *                   type: array
 *                   items: {}
 *       422:
 *         description: Validation error occurred.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Whether the request was successful.
 *                   example: false
 *                 message:
 *                   type: string
 *                   description: Validation error message.
 *                   example: "Invalid input: timesheetd is required."
 *                 data:
 *                   type: array
 *                   items: {}
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   description: Whether the request was successful.
 *                   example: false
 *                 message:
 *                   type: string
 *                   description: Error message.
 *                   example: "Internal server error"
 *                 data:
 *                   type: array
 *                   items: {}
 */

    async manageAllTimesheet(req,res)
    {
        let adminId= req.session?.user?.id//id comes from token
        const admin=await userRepository.getUserById(adminId)
        
        const{timesheetid,status,userid,notes}=req.body
        try
        {
            const validatedData=await managetimesheetRequest.validateData(req.body)
            if(!validatedData.isValid)
            {
                throw new CustomValidationError(validatedData.message)
            }
          

            const {startDate,endDate}=await timesheetrepo.getWeekStartAndEndDateByTimesheetId(timesheetid)

            const alreadyRejected=await rejectRepo.getByWeek(startDate,endDate,userid)

            if(alreadyRejected && status==="approved")
            {
                await notification.createNotification(userid,`Timesheet  has been ${status} by ${admin.full_name}`,"info")
                await rejectRepo.delete(alreadyRejected._id)
                return res.status(200).json({
                    status:true,
                    message:"Timesheet Approved",
                    data:[]
                })

            }

            await timesheetrepo.updateAllTimesheetStatus(startDate,endDate,status,userid)

            if(status==="rejected")
            {
                if(alreadyRejected)
                {
                    await rejectRepo.update(alreadyRejected._id,notes)
                    return res.status(200).json({
                        status:true,
                        message:"Timesheet Notes updated successfully",
                        data:[]
                    })
                    
                }
                else
                {
                  await rejectRepo.create(userid,notes,startDate,endDate)
                  return res.status(200).json({
                    status:true,
                    message:"Timesheet Status updated successfully",
                    data:[]
                })
                }
            } 
        }
        catch(error)
        {
            
            if(error instanceof CustomValidationError)
            {
                return res.status(422).json(
                    {status:false,
                    message:error.message,
                    data:[]
                })
            }
            else
            {
            return res.status(500).json(
                {
                status:false,
                message:"Internal server error",
                data:[]
            })
        }
        }
    }
}
export default TimesheetApprovalController