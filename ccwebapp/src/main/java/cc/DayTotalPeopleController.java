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

}
