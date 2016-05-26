package cc;

import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.springframework.data.jpa.repository.Modifying;

import javax.persistence.*;
import org.joda.time.LocalDate;
import org.joda.time.format.DateTimeFormatter;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.GenerationType;
import org.joda.time.format.DateTimeFormat;
import javax.persistence.JoinColumn;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.time.ZoneId;

/**
 * Created by harryquigley on 25/04/2016.
 */
@Entity
@NamedQueries({
        @NamedQuery(name = "DayTotalPeople.updateTotal", query = "update DayTotalPeople d set d.totalPeople =?1 where d.date =?2 AND d.venue =?3"),
        @NamedQuery(name = "DayTotalPeople.findSumPeopleByVenueAndDateBetween", query = "select sum(d.totalPeople) from DayTotalPeople d where d.venue=?1 and d.date between ?2 and ?3")
})
public class DayTotalPeople {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    private LocalDate date;

    private Integer totalPeople;

    @ManyToOne
    @JoinColumn(name = "venue_id")
    @JsonBackReference
    private Venue venue;

    public DayTotalPeople() {}

    public DayTotalPeople(LocalDate date, Integer totalPeople, Venue venue) {
        this.date = date;
        this.totalPeople = totalPeople;
        this.venue = venue;
    }

    public void setDate(LocalDate date) {this.date = date;}

    public LocalDate getDate() {return date;}

    public void setTotalPeople(Integer totalPeople) {this.totalPeople = totalPeople;}

    public Integer getTotalPeople() {return totalPeople;}

    @JsonBackReference
    public Venue getVenue() {return venue;}

    public void setVenue(Venue venue) {this.venue = venue;}

    @Override
    public String toString(){

        long epoch = date.toDateTimeAtStartOfDay(DateTimeZone.UTC).getMillis();
        String s = "["+epoch+","+totalPeople+"]";
        return s;
    }


}