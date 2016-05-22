package cc;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Collection;
import java.util.List;

@Entity
public class Venue implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;
    private String email;
    private String password;
    private Integer capacity;

    @OneToMany(mappedBy = "venue")
    private List<Timestamp> timestamps;
    //list is not ordered

    @OneToMany(mappedBy = "venue")
    @JsonManagedReference
    private List<DayTotalPeople> dayTotalPeople;

    public Venue(){

    }

    public Venue(Venue venue){
        this.id = venue.id;
        this.email = venue.email;
        this.password = venue.password;
        this.capacity = venue.capacity;
        this.timestamps = venue.timestamps;
    }

    public Integer getId() { return id;}

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {this.email = email; }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {this.password = password; }

    public void setTimestamps(List<Timestamp> timestamps) {
        this.timestamps = timestamps;
    }

    public Collection<Timestamp> getTimestamps() {
        return timestamps;
    }

    public void setDayTotalPeople(List<DayTotalPeople> dayTotalPeople) {
        this.dayTotalPeople = dayTotalPeople;
    }

    @JsonManagedReference
    public Collection<DayTotalPeople> getDayTotalPeople() {
        return dayTotalPeople;
    }

}


