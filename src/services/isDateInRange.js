export default class IsDateInRange{
    // utils/checkDateInRange.js
    isDateInRange(itemDate, startDate, endDate) {
        const parsedItemDate = new Date(itemDate);
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        console.log(parsedItemDate,parsedStartDate, parsedEndDate)

        // Check if the itemDate is within the range
        return parsedItemDate >= parsedStartDate && parsedItemDate <= parsedEndDate;
    }
}