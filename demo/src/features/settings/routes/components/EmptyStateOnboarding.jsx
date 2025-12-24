import Button from "@/components/ui/Button";
import { BookOpen, Dog, Play } from "lucide-react";

const EmptyStateOnboarding = ({
  objectType,
  onBrowseTemplates,
  onCreateProperty,
  onWatchTutorial,
}) => {
  const getExamples = (type) => {
    switch (type) {
      case "pets":
        return {
          title: "For Pets",
          examples: [
            "Special dietary needs (grain-free, allergies)",
            "Behavioral notes (reactive, shy, playful)",
            "Preferred run location (quiet area, with window)",
            "Daycare group assignment (small dogs, puppies)",
          ],
        };
      case "owners":
        return {
          title: "👤 For Owners",
          examples: [
            "Preferred contact method (call, text, email)",
            "VIP status / Membership tier",
            "Referral source (Google, friend, vet)",
            "Communication preferences (daily updates, emergencies)",
          ],
        };
      case "bookings":
        return {
          title: "📅 For Bookings",
          examples: [
            "Pick-up authorization (who can pick up pet)",
            "Special requests (late checkout, extra playtime)",
            "Add-on services selected (nail trim, bath)",
            "Room preference (suite, standard, outdoor run)",
          ],
        };
      case "invoices":
        return {
          title: "🧾 For Invoices",
          examples: [
            "Payment terms (net 30, due on receipt)",
            "Discount codes applied",
            "Tax exemption status",
            "Invoice category (boarding, grooming, retail)",
          ],
        };
      case "payments":
        return {
          title: "💳 For Payments",
          examples: [
            "Payment method preference (card, cash, check)",
            "Autopay enrollment status",
            "Receipt delivery method (email, SMS)",
            "Split payment allocation (multiple pets/services)",
          ],
        };
      case "tickets":
        return {
          title: "🎫 For Tickets",
          examples: [
            "Issue priority level (low, medium, high, urgent)",
            "Department assignment (front desk, grooming, boarding)",
            "Resolution category (resolved, escalated, pending)",
            "Customer satisfaction rating (1-5 stars)",
          ],
        };
      default:
        return {
          title: "For Pets",
          examples: [
            "Special dietary needs (grain-free, allergies)",
            "Behavioral notes (reactive, shy, playful)",
            "Preferred run location (quiet area, with window)",
            "Daycare group assignment (small dogs, puppies)",
          ],
        };
    }
  };

  const examples = getExamples(objectType);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-surface-primary rounded-lg border border-gray-200 dark:border-surface-border p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-text-primary mb-2">
            No custom properties yet
          </h2>
          <p className="text-gray-600 dark:text-text-secondary mb-6">
            Custom properties let you track specific information about your{" "}
            {objectType.replace("s", "")}s beyond the standard fields.
          </p>
        </div>

        {/* Examples */}
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 text-center">
            POPULAR EXAMPLES:
          </h3>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center justify-center gap-2">
              {examples.title}
            </h4>
            <ul className="space-y-2 max-w-xl mx-auto">
              {examples.examples.map((example, index) => (
                <li
                  key={index}
                  className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2"
                >
                  <span className="text-blue-500 mt-0.5">•</span>
                  {example}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onBrowseTemplates}
            className="flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            Browse Templates
          </Button>
          <Button
            variant="outline"
            onClick={onCreateProperty}
            className="flex items-center gap-2"
          >
            <Dog className="w-4 h-4" />
            Create Custom Property
          </Button>
          <Button
            variant="outline"
            onClick={onWatchTutorial}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Watch Tutorial
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-surface-border">
          <p className="text-sm text-gray-500 dark:text-text-secondary">
            Need help getting started? Check out our{" "}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              documentation
            </a>{" "}
            or{" "}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              contact support
            </a>{" "}
            for personalized guidance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyStateOnboarding;
