package cc;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/**
 * Created by harryquigley on 21/05/2016.
 */
@RestController
public class    TimeStampController {

    @Autowired
    private VenueRepository vr;

    @Autowired
    private TimestampRepository timestampRepository;

    @RequestMapping(value ="/CurrentAttendance", method = RequestMethod.GET, headers = "Accept=application/json")
    public Integer latestTimestamp(Principal principal) {

        String email = principal.getName();
        Venue v = vr.findByEmail(email);

        Integer t = timestampRepository.findByLatestTimestamp(v);
        return t;

    }


}
