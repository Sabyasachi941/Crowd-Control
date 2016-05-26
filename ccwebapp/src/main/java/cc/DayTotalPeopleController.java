package cc;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.ArrayList;
import java.util.List;

/**
 * Created by harryquigley on 30/04/2016.
 */
@RestController
public class DayTotalPeopleController {

    @Autowired
    private DayTotalPeopleRepository dtpr;

    @Autowired
    private VenueRepository vr;

    @RequestMapping(value ="/graphData", method = RequestMethod.GET, headers = "Accept=application/json")
    public String getGraphData(Principal principal) {
        //This should all be in a service class but i haven't got it working in one yet!
        //Actually no i think it's right here!
        List<DayTotalPeople> list;
        String returnString="[";
        String email = principal.getName();
        Venue v = vr.findByEmail(email);
        list = dtpr.findByVenue(v);
        List<String> dayTotalPeopleListStrings = new ArrayList<>();
        for (DayTotalPeople d: list) {
            System.out.println(d.toString());
            String s = d.toString();
            //s = s.replace("\"", "");
            returnString+=s;
            if (list.indexOf(d)==list.size()-1)
                returnString+="]";
            else
                returnString+=",";
            //dayTotalPeopleListStrings.add(s);
        }

        /*if (dayTotalPeopleListStrings.isEmpty())
            return "empty";
        else return "not empty";*/
        //return dayTotalPeopleListStrings;
        return returnString;

    }

    @RequestMapping(value ="/MonthlyIncreaseOrDecrease", method = RequestMethod.GET, headers = "Accept=application/json")
    public String getMonthlyIncreaseOrDecrease(Principal principal) {
        //method to get the increase or decrease in footfall numbers for the month so far compared with this time last month
        String email = principal.getName();
        Venue v = vr.findByEmail(email);
        org.joda.time.LocalDate today = org.joda.time.LocalDate.now();
        org.joda.time.LocalDate startOfMonth = new org.joda.time.LocalDate().withDayOfMonth(1);
        org.joda.time.LocalDate currentDateLastMonth = today.minusMonths(1);
        org.joda.time.LocalDate startOfLastMonth = startOfMonth.minusMonths(1);
        double totalThisMonth = dtpr.findTotalPeopleByVenueAndDateBetween(v,startOfMonth, today);
        double totalLastMonth = dtpr.findTotalPeopleByVenueAndDateBetween(v,startOfLastMonth, currentDateLastMonth);

        return String.valueOf(totalThisMonth);
    }

}
