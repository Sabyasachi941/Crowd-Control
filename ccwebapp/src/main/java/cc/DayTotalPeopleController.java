package cc;

import org.joda.time.LocalDate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Calendar;
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
        List<DayTotalPeople> list;
        String returnString="[";
        String email = principal.getName();
        Venue v = vr.findByEmail(email);
        list = dtpr.findByVenue(v);
        List<String> dayTotalPeopleListStrings = new ArrayList<>();
        for (DayTotalPeople d: list) {
            System.out.println(d.toString());
            String s = d.toString();
            returnString+=s;
            if (list.indexOf(d)==list.size()-1)
                returnString+="]";
            else
                returnString+=",";
        }
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
        double totalThisMonth = dtpr.findSumPeopleByVenueAndDateBetween(v,startOfMonth, today);
        double totalLastMonth = dtpr.findSumPeopleByVenueAndDateBetween(v,startOfLastMonth, currentDateLastMonth);
        double newNum;
        //if percentage is positive num then there's a percentage increase
        //uf percentage is negative num then there's a percentage decrease
        newNum = totalThisMonth - totalLastMonth;
        double increaseOrDecrease = newNum/totalLastMonth;
        double percentage =  increaseOrDecrease*100;

        DecimalFormat df = new DecimalFormat("#.####");
        String percentageString = df.format(percentage);

        return percentageString;
    }

    @RequestMapping(value = "/soFarThisMonth", method = RequestMethod.GET, headers =  "Accept=application/json")
    public Integer getMonthSoFar(Principal principal){
        String email = principal.getName();
        Venue v = vr.findByEmail(email);
        org.joda.time.LocalDate today = org.joda.time.LocalDate.now();
        org.joda.time.LocalDate startOfMonth = new org.joda.time.LocalDate().withDayOfMonth(1);
        int monthSoFar = dtpr.findSumPeopleByVenueAndDateBetween(v,startOfMonth, today);
        return monthSoFar;
    }

    @RequestMapping(value = "/monthTotalSinceYearStart", method = RequestMethod.GET, headers =  "Accept=application/json" )
    public String getLastSevenDays(Principal principal) {
        List<Object[]> list;
        String email = principal.getName();
        String returnString="[";
        Venue v = vr.findByEmail(email);
        int year = Calendar.getInstance().get(Calendar.YEAR);
        org.joda.time.LocalDate today = org.joda.time.LocalDate.now();
        org.joda.time.LocalDate startYear = new LocalDate(year,1,1);
        list=dtpr.findMonthlyTotal(v,startYear,today);
        //List<MyObject> result = new ArrayList<>(list.size());
        for (Object[] l: list) {
            Long sumPeople = (Long) l[0];
            Integer date = (Integer) l[1];
            String s = sumPeople.toString();
            String s2 = date.toString();
            returnString= returnString+"["+s2+", ";
            returnString+=s+"]";
            if (list.indexOf(l)==list.size()-1)
                returnString+="]";
            else
                returnString+=",";
        }
        return returnString;
    }

    @RequestMapping(value = "/yearlyTotals", method = RequestMethod.GET, headers =  "Accept=application/json" )
    public String getYearlyTotals(Principal principal) {
        List<Object[]> list;
        String email = principal.getName();
        String returnString="[";
        Venue v = vr.findByEmail(email);
        list = dtpr.findYearlyTotal(v);
        for (Object[] l: list) {
            Long sumPeople = (Long) l[0];
            Integer date = (Integer) l[1];
            String s = sumPeople.toString();
            String s2 = date.toString();
            returnString= returnString+"["+s2+", ";
            returnString+=s+"]";
            if (list.indexOf(l)==list.size()-1)
                returnString+="]";
            else
                returnString+=",";
        }
        return returnString;

    }
}