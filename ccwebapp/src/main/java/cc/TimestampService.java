package cc;

import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.joda.time.DateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.joda.time.format.DateTimeFormat;
import java.text.SimpleDateFormat;
import org.joda.time.format.DateTimeFormatter;

/**
 * Created by harryquigley on 27/04/2016.
 */

@Service
public class TimestampService {

    @Autowired
    private TimestampRepository timestampRepository;

    @Autowired
    private VenueService venueService;

    @Autowired
    private DayTotalPeopleRepository dayTotalPeopleRepository;

    //Runs 1 second before midnight every day : maybe it will have to be ran slightly earlier to allow for time
    //idk if the localDate in function below is created before the clock strikes midnight! - easily tested anyway
    @Scheduled(cron = "59 59 11 * * *")
    //@Scheduled(cron = "* * * * * *")
    public void updateTotal(){

        //initialise startTime - holds timestamp for the very beginning of today
        DateTime startTime = new DateTime();
        //localdate used when inserting total in DayTotalPeople down below
        LocalDate d = new LocalDate();
        //day month & year = todays date
        startTime.withDate(DateTime.now().getYear(),DateTime.now().getMonthOfYear(),DateTime.now().getDayOfMonth());
        //time = 00:00:00
        startTime = startTime.hourOfDay().setCopy(0);
        startTime = startTime.minuteOfHour().setCopy(0);
        startTime = startTime.secondOfMinute().setCopy(0);

        //Give startTime the same format as timestamp in DB
        DateTimeFormatter dtfOut = DateTimeFormat.forPattern("yyyy-MM-dd hh:mm:ss");
        String sTime = dtfOut.print(startTime);
        DateTime st = dtfOut.parseDateTime(sTime);
        //System.out.println(sTime);


        //endTime is todays date with time 23:59:59
        DateTime endTime = new DateTime();
        endTime.withDate(DateTime.now().getYear(),DateTime.now().getMonthOfYear(),DateTime.now().getDayOfMonth());
        endTime = endTime.hourOfDay().setCopy(23);
        endTime = endTime.minuteOfHour().setCopy(59);
        endTime = endTime.secondOfMinute().setCopy(59);

        String eTime = dtfOut.print(endTime);
        //System.out.println(eTime);
        DateTime et = dtfOut.parseDateTime(eTime);
        System.out.println(d);
        Iterable<Venue> venues = venueService.listAllVenues();

        for(Venue v: venues) {
            Integer total = timestampRepository.findByInDay(v,st,et);
            dayTotalPeopleRepository.updateTotal(total,d,v);
            //dayTotalPeopleRepository.findByDateAndVenue(d,v).setTotalPeople(total);
            //dtp.setTotalPeople(total);

            System.out.println(total);
        }


    }

}
