import Joi from "joi";
import SubscriptionRepository from "../../repositories/admin/subscription-repository.js";
import { CustomValidationError } from "../../exceptions/custom-validation-error.js";
import Project from "../../models/projects.js";
class AddSubscriptionRequest {
  static subscriptionRepo = new SubscriptionRepository();

  static schema = Joi.object({
    subscription_name: Joi.string().required().messages({
      "string.empty": "Please enter the subscription name.",
      "any.required": "Please enter the subscription name.",
    }),
    provider: Joi.string().required().messages({
      "string.empty": "Please enter the provider.",
      "any.required": "Please enter the provider.",
    }),
    license_count: Joi.string().required().messages({
      "string.empty": "Please enter the license count.",
      "any.required": "Please enter the license count.",
    }),
    cost: Joi.string().required().messages({
      "string.empty": "Please enter the cost.",
      "any.required": "Please enter the cost.",
    }),
    billing_cycle: Joi.string()
      .valid(
        "Monthly",
        "Quarterly",
        "Annually",
        "Pay As You Go",
        "One Time Payment"
      )
      .required(),
    currency: Joi.string().required().messages({
      "string.empty": "Please enter the currency.",
      "any.required": "Please enter the currency.",
    }),
    payment_method: Joi.string().required().messages({
      "string.empty": "Please enter the payment method.",
      "any.required": "Please enter the payment method.",
    }),
    status: Joi.string().valid("Active", "Pending", "Expired").required(),
    description: Joi.string().optional().allow("").allow(null),
    next_due_date: Joi.date().optional().allow("").allow(null),
    type: Joi.string().valid("Common", "Project Specific").required().messages({
      "any.only": "Type must be either 'Common' or 'Project Specific'",
      "any.required": "Please select the subscription type",
    }),
    project_name: Joi.alternatives().conditional("type", {
      is: "Project Specific",
      then: Joi.string()
        .custom((value, helpers) => {
          if (!mongoose.Types.ObjectId.isValid(value)) {
            return helpers.error("any.invalid");
          }
          return value;
        })
        .required()
        .messages({
          "any.required":
            "Project name is required for Project Specific subscriptions",
          "any.invalid": "Invalid project selected",
        }),
      otherwise: Joi.string().allow(null, ""),
    }),
  });

  constructor(req) {
    this.data = {
      subscription_name: req.body.subscription_name,
      provider: req.body.provider,
      license_count: req.body.license_count,
      cost: req.body.cost,
      billing_cycle: req.body.billing_cycle,
      currency: req.body.currency,
      payment_method: req.body.payment_method,
      status: req.body.status,
      description: req.body.description,
      next_due_date: req.body.next_due_date,
      type: req.body.type,
      project_name:
        req.body.type === "Project Specific" ? req.body.project_name : null,
    };
  }

  async validate() {
    // Validate using Joi
    const { error, value } = AddSubscriptionRequest.schema.validate(this.data, {
      abortEarly: false,
    });

    // Collect validation errors
    const validationErrors = {};
    if (error) {
      error.details.forEach((err) => {
        validationErrors[err.context.key] = err.message;
      });
    }

    // Additional validation for project existence when type is Project Specific
    if (value.type === "Project Specific" && value.project_name) {
      const project = await Project.findById(value.project_name);
      if (!project) {
        validationErrors["project_name"] = "Selected project does not exist";
      }
    }

    // Check for existing subscription name only if it's provided
    // Temporarily comment out or modify this block for testing
    if (value.subscription_name) {
      const existingSubscription =
        await AddSubscriptionRequest.subscriptionRepo.checkSubscriptionExists(
          value.subscription_name
        );

      if (existingSubscription) {
        validationErrors["subscription_name"] =
          "A subscription with this name already exists.";
      }
    }

    // If there are any errors, throw CustomValidationError
    if (Object.keys(validationErrors).length > 0) {
      throw new CustomValidationError(validationErrors);
    }

    return value;
  }
}

export default AddSubscriptionRequest;